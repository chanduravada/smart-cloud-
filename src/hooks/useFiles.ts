import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { toast } from 'sonner';

export interface FileMetadata {
  id: string;
  user_id: string;
  name: string;
  original_name: string;
  file_type: string;
  mime_type: string;
  size: number;
  file_hash: string;
  storage_path: string; // S3 key
  category: string;
  tags: string[];
  ai_classification: {
    category: string;
    tags: string[];
    confidence: number;
    description?: string;
  } | null;
  is_duplicate: boolean;
  duplicate_of: string | null;
  created_at: string;
  updated_at: string;
}

export interface FileFilters {
  search?: string;
  category?: string;
  fileType?: string;
  dateRange?: { from: Date; to: Date };
  tags?: string[];
}

// ─── S3 Storage helpers via Edge Function ────────────────────────────────────

async function callS3Function(body: Record<string, unknown>) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Not authenticated');

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
  const functionUrl = `${supabaseUrl}/functions/v1/s3-storage`;

  const resp = await fetch(functionUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
      'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string,
    },
    body: JSON.stringify(body),
  });

  const json = await resp.json();
  if (!resp.ok) throw new Error(json.error || `S3 function error (${resp.status})`);
  return json;
}

async function s3GetUploadUrl(filename: string, mimeType: string): Promise<{ uploadUrl: string; s3Key: string }> {
  return callS3Function({ action: 'upload', filename, mimeType });
}

async function s3GetDownloadUrl(key: string): Promise<{ downloadUrl: string }> {
  return callS3Function({ action: 'download', key });
}

async function s3DeleteObject(key: string): Promise<void> {
  await callS3Function({ action: 'delete', key });
}

// ─── useFiles hook ────────────────────────────────────────────────────────────

export function useFiles() {
  const { user } = useAuth();
  const [files, setFiles] = useState<FileMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  const fetchFiles = useCallback(async (filters?: FileFilters) => {
    if (!user) return;

    setLoading(true);
    try {
      let query = supabase
        .from('files')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (filters?.search) {
        query = query.ilike('name', `%${filters.search}%`);
      }
      if (filters?.category && filters.category !== 'all') {
        query = query.eq('category', filters.category);
      }
      if (filters?.fileType && filters.fileType !== 'all') {
        query = query.eq('file_type', filters.fileType);
      }
      if (filters?.tags && filters.tags.length > 0) {
        query = query.overlaps('tags', filters.tags);
      }

      const { data, error } = await query;
      if (error) throw error;

      const typedData = (data || []).map(file => ({
        ...file,
        ai_classification: file.ai_classification as FileMetadata['ai_classification'],
      }));

      setFiles(typedData);
    } catch (error) {
      console.error('Error fetching files:', error);
      toast.error('Failed to load files');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  const computeFileHash = async (file: File): Promise<string> => {
    const buffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  };

  const checkDuplicate = async (hash: string): Promise<FileMetadata | null> => {
    if (!user) return null;

    const { data } = await supabase
      .from('files')
      .select('*')
      .eq('user_id', user.id)
      .eq('file_hash', hash)
      .maybeSingle();

    if (data) {
      return {
        ...data,
        ai_classification: data.ai_classification as FileMetadata['ai_classification'],
      };
    }
    return null;
  };

  const classifyFile = async (
    file: File,
    content?: string
  ): Promise<{ category: string; tags: string[]; confidence: number; description: string }> => {
    try {
      const { data, error } = await supabase.functions.invoke('classify-file', {
        body: {
          fileName: file.name,
          mimeType: file.type,
          size: file.size,
          content: content || null,
        },
      });
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('AI classification error:', error);
      const ext = file.name.split('.').pop()?.toLowerCase() || '';
      const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'];
      const documentExts = ['pdf', 'doc', 'docx', 'txt', 'rtf'];
      const reportExts = ['xls', 'xlsx', 'csv', 'ppt', 'pptx'];

      let category = 'other';
      if (imageExts.includes(ext)) category = 'image';
      else if (documentExts.includes(ext)) category = 'document';
      else if (reportExts.includes(ext)) category = 'report';

      return { category, tags: [ext], confidence: 0.5, description: 'Fallback classification' };
    }
  };

  const uploadFile = async (
    file: File,
    skipDuplicateCheck = false
  ): Promise<{ success: boolean; duplicate?: FileMetadata }> => {
    if (!user) {
      toast.error('Please sign in to upload files');
      return { success: false };
    }

    setUploading(true);
    try {
      // 1. Duplicate detection
      const fileHash = await computeFileHash(file);
      if (!skipDuplicateCheck) {
        const existingFile = await checkDuplicate(fileHash);
        if (existingFile) {
          setUploading(false);
          return { success: false, duplicate: existingFile };
        }
      }

      // 2. Read text content for AI classification
      let fileContent: string | undefined;
      if (file.type.startsWith('text/')) {
        fileContent = await file.text();
      }

      // 3. AI classification
      const classification = await classifyFile(file, fileContent);

      // 4. Get a presigned S3 PUT URL from the Edge Function
      const { uploadUrl, s3Key } = await s3GetUploadUrl(file.name, file.type);

      // 5. Upload directly to S3 (no AWS credentials in the browser)
      const uploadResp = await fetch(uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file,
      });

      if (!uploadResp.ok) {
        const text = await uploadResp.text();
        throw new Error(`S3 upload failed (${uploadResp.status}): ${text}`);
      }

      // 6. Save metadata to Supabase DB (storage_path = s3Key)
      const extension = file.name.split('.').pop()?.toLowerCase() || 'unknown';
      const { error: dbError } = await supabase.from('files').insert({
        user_id: user.id,
        name: file.name,
        original_name: file.name,
        file_type: extension,
        mime_type: file.type,
        size: file.size,
        file_hash: fileHash,
        storage_path: s3Key,
        category: classification.category,
        tags: classification.tags,
        ai_classification: classification,
        is_duplicate: false,
      });

      if (dbError) throw dbError;

      toast.success(`File uploaded: ${file.name}`);
      await fetchFiles();
      return { success: true };
    } catch (error) {
      console.error('Upload error:', error);
      toast.error(`Upload failed: ${(error as Error).message}`);
      return { success: false };
    } finally {
      setUploading(false);
    }
  };

  const deleteFile = async (fileId: string) => {
    if (!user) return;

    try {
      // 1. Get file metadata
      const { data: fileData } = await supabase
        .from('files')
        .select('storage_path')
        .eq('id', fileId)
        .single();

      if (!fileData) throw new Error('File not found');

      // 2. Delete from S3
      await s3DeleteObject(fileData.storage_path);

      // 3. Delete metadata from DB
      const { error: dbError } = await supabase
        .from('files')
        .delete()
        .eq('id', fileId);

      if (dbError) throw dbError;

      toast.success('File deleted');
      await fetchFiles();
    } catch (error) {
      console.error('Delete error:', error);
      toast.error(`Delete failed: ${(error as Error).message}`);
    }
  };

  const downloadFile = async (file: FileMetadata) => {
    try {
      // Get a presigned GET URL from the Edge Function
      const { downloadUrl } = await s3GetDownloadUrl(file.storage_path);

      // Trigger browser download via a hidden link
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = file.original_name;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success('Download started');
    } catch (error) {
      console.error('Download error:', error);
      toast.error(`Download failed: ${(error as Error).message}`);
    }
  };

  const getFileUrl = async (file: FileMetadata): Promise<string> => {
    const { downloadUrl } = await s3GetDownloadUrl(file.storage_path);
    return downloadUrl;
  };

  return {
    files,
    loading,
    uploading,
    fetchFiles,
    uploadFile,
    deleteFile,
    downloadFile,
    getFileUrl,
    checkDuplicate,
  };
}

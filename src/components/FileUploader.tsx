import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { FileMetadata } from '@/hooks/useFiles';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Upload, Cloud, FileWarning, Loader2, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FileUploaderProps {
  onUpload: (file: File, skipDuplicateCheck?: boolean) => Promise<{ success: boolean; duplicate?: FileMetadata }>;
  uploading: boolean;
}

export function FileUploader({ onUpload, uploading }: FileUploaderProps) {
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [duplicateFile, setDuplicateFile] = useState<FileMetadata | null>(null);
  const [showDuplicateDialog, setShowDuplicateDialog] = useState(false);

  const handleUpload = useCallback(async (file: File, skipDuplicateCheck = false) => {
    const result = await onUpload(file, skipDuplicateCheck);

    if (!result.success && result.duplicate) {
      setPendingFile(file);
      setDuplicateFile(result.duplicate);
      setShowDuplicateDialog(true);
    }
  }, [onUpload]);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    for (const file of acceptedFiles) {
      await handleUpload(file);
    }
  }, [handleUpload]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'text/plain': ['.txt'],
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
      'image/gif': ['.gif'],
      'image/webp': ['.webp'],
      'image/svg+xml': ['.svg'],
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'text/csv': ['.csv'],
      'application/vnd.ms-powerpoint': ['.ppt'],
      'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['.pptx'],
      // Audio
      'audio/mpeg': ['.mp3'],
      'audio/wav': ['.wav'],
      'audio/aac': ['.aac'],
      'audio/flac': ['.flac'],
      'audio/ogg': ['.ogg'],
      'audio/mp4': ['.m4a'],
      'audio/x-m4a': ['.m4a'],
      // Video
      'video/mp4': ['.mp4'],
      'video/quicktime': ['.mov'],
      'video/x-msvideo': ['.avi'],
      'video/x-matroska': ['.mkv'],
      'video/webm': ['.webm'],
      'video/x-ms-wmv': ['.wmv'],
    },
    maxSize: 52428800, // 50MB
    disabled: uploading,
  });

  const handleForceUpload = async () => {
    if (pendingFile) {
      setShowDuplicateDialog(false);
      await handleUpload(pendingFile, true);
      setPendingFile(null);
      setDuplicateFile(null);
    }
  };

  const handleCancelUpload = () => {
    setShowDuplicateDialog(false);
    setPendingFile(null);
    setDuplicateFile(null);
  };

  return (
    <>
      <div
        {...getRootProps()}
        className={cn(
          "relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200",
          isDragActive
            ? "border-primary bg-primary/5 scale-[1.02]"
            : "border-border hover:border-primary/50 hover:bg-muted/30",
          uploading && "opacity-60 cursor-not-allowed"
        )}
      >
        <input {...getInputProps()} />

        <div className="flex flex-col items-center gap-4">
          <div className={cn(
            "p-4 rounded-full transition-all duration-200",
            isDragActive ? "bg-primary/10" : "bg-muted"
          )}>
            {uploading ? (
              <Loader2 className="h-8 w-8 text-primary animate-spin" />
            ) : isDragActive ? (
              <Cloud className="h-8 w-8 text-primary animate-bounce" />
            ) : (
              <Upload className="h-8 w-8 text-muted-foreground" />
            )}
          </div>

          <div>
            <p className="text-lg font-medium">
              {uploading
                ? 'Uploading...'
                : isDragActive
                  ? 'Drop files here'
                  : 'Drag & drop files here'}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              or click to browse (PDF, DOCX, Images, Audio, Video — up to 50MB)
            </p>
          </div>

          {!uploading && !isDragActive && (
            <Button variant="outline" className="mt-2">
              <Upload className="h-4 w-4 mr-2" />
              Browse Files
            </Button>
          )}

          {uploading && (
            <Progress value={50} className="w-48 h-2 mt-2" />
          )}
        </div>
      </div>

      {/* Duplicate File Warning Dialog */}
      <Dialog open={showDuplicateDialog} onOpenChange={setShowDuplicateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileWarning className="h-5 w-5 text-warning" />
              Duplicate File Detected
            </DialogTitle>
            <DialogDescription>
              A file with the same content already exists in your storage.
            </DialogDescription>
          </DialogHeader>

          {duplicateFile && (
            <div className="p-4 bg-muted rounded-lg">
              <p className="font-medium">{duplicateFile.name}</p>
              <p className="text-sm text-muted-foreground mt-1">
                Uploaded on {new Date(duplicateFile.created_at).toLocaleDateString()}
              </p>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={handleCancelUpload}>
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button onClick={handleForceUpload} className="gradient-primary">
              Upload Anyway
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

import { useEffect, useState } from 'react';
import { FileMetadata } from '@/hooks/useFiles';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Download, X, Loader2, FileQuestion, Music, Video, FileText } from 'lucide-react';
import { format } from 'date-fns';

interface FilePreviewModalProps {
    file: FileMetadata | null;
    onClose: () => void;
    onDownload: (file: FileMetadata) => void;
    getUrl: (file: FileMetadata) => Promise<string>;
}

function getPreviewType(mimeType: string): 'image' | 'audio' | 'video' | 'pdf' | 'text' | 'none' {
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.startsWith('audio/')) return 'audio';
    if (mimeType.startsWith('video/')) return 'video';
    if (mimeType === 'application/pdf') return 'pdf';
    if (mimeType.startsWith('text/')) return 'text';
    return 'none';
}

const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

export function FilePreviewModal({ file, onClose, onDownload, getUrl }: FilePreviewModalProps) {
    const [url, setUrl] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!file) { setUrl(null); return; }
        setLoading(true);
        setError(null);
        setUrl(null);
        getUrl(file)
            .then(setUrl)
            .catch(() => setError('Could not load preview.'))
            .finally(() => setLoading(false));
    }, [file?.id]);

    if (!file) return null;

    const previewType = getPreviewType(file.mime_type);

    return (
        <Dialog open={!!file} onOpenChange={(open) => { if (!open) onClose(); }}>
            <DialogContent className="max-w-4xl w-full max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden">
                {/* Header */}
                <DialogHeader className="flex flex-row items-center justify-between px-5 py-4 border-b shrink-0 space-y-0">
                    <DialogTitle className="truncate text-base font-semibold pr-4">{file.name}</DialogTitle>
                    <div className="flex items-center gap-2 shrink-0">
                        <Button variant="outline" size="sm" className="gap-1.5 h-8" onClick={() => onDownload(file)}>
                            <Download className="h-3.5 w-3.5" />
                            Download
                        </Button>
                    </div>
                </DialogHeader>

                {/* Preview area */}
                <div className="flex-1 overflow-auto min-h-0 bg-muted/30">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center h-64 gap-3 text-muted-foreground">
                            <Loader2 className="h-8 w-8 animate-spin" />
                            <p className="text-sm">Loading preview…</p>
                        </div>
                    ) : error ? (
                        <div className="flex flex-col items-center justify-center h-64 gap-3 text-muted-foreground">
                            <FileQuestion className="h-10 w-10" />
                            <p className="text-sm">{error}</p>
                        </div>
                    ) : url && previewType === 'image' ? (
                        <div className="flex items-center justify-center p-6 min-h-[300px]">
                            <img
                                src={url}
                                alt={file.name}
                                className="max-w-full max-h-[60vh] object-contain rounded-lg shadow-md"
                            />
                        </div>
                    ) : url && previewType === 'audio' ? (
                        <div className="flex flex-col items-center justify-center h-64 gap-6 p-8">
                            <div className="p-6 rounded-2xl bg-orange-500/10 text-orange-500">
                                <Music className="h-16 w-16" />
                            </div>
                            <audio controls src={url} className="w-full max-w-md">
                                Your browser does not support audio playback.
                            </audio>
                        </div>
                    ) : url && previewType === 'video' ? (
                        <div className="flex items-center justify-center p-4 bg-black/50 min-h-[300px]">
                            <video
                                controls
                                src={url}
                                className="max-w-full max-h-[60vh] rounded-lg"
                            >
                                Your browser does not support video playback.
                            </video>
                        </div>
                    ) : url && previewType === 'pdf' ? (
                        <iframe
                            src={url}
                            className="w-full h-[65vh] border-0"
                            title={file.name}
                        />
                    ) : url && previewType === 'text' ? (
                        <div className="p-6">
                            <iframe src={url} className="w-full h-[55vh] border rounded-lg bg-background" title={file.name} />
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-64 gap-4 text-muted-foreground">
                            <div className="p-5 rounded-2xl bg-muted">
                                <FileText className="h-12 w-12" />
                            </div>
                            <div className="text-center">
                                <p className="text-sm font-medium">No preview available</p>
                                <p className="text-xs mt-1">Download the file to open it</p>
                            </div>
                            <Button variant="outline" className="gap-2 mt-2" onClick={() => onDownload(file)}>
                                <Download className="h-4 w-4" />
                                Download {file.name}
                            </Button>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="border-t px-5 py-3 flex items-center gap-4 text-xs text-muted-foreground shrink-0 bg-muted/20">
                    <span className="capitalize font-medium text-foreground">{file.category}</span>
                    <span>·</span>
                    <span>{formatFileSize(file.size)}</span>
                    <span>·</span>
                    <span>{file.mime_type}</span>
                    <span>·</span>
                    <span>{format(new Date(file.created_at), 'MMM d, yyyy')}</span>
                </div>
            </DialogContent>
        </Dialog>
    );
}

import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Cloud, Download, FileText, Image, Music, Video, FileSpreadsheet, Clock, AlertCircle, Eye, ExternalLink } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface SharedFile {
    name: string;
    size: number;
    category: string;
    mime_type: string;
    allow_download: boolean;
    storage_path: string;
    download_count: number;
    max_downloads: number | null;
    expires_at: string;
}

function formatBytes(bytes: number) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

function getCategoryIcon(category: string, mimeType: string) {
    if (mimeType.startsWith('image/')) return <Image className="h-10 w-10 text-purple-400" />;
    if (mimeType.startsWith('audio/')) return <Music className="h-10 w-10 text-amber-400" />;
    if (mimeType.startsWith('video/')) return <Video className="h-10 w-10 text-rose-400" />;
    if (category === 'document') return <FileText className="h-10 w-10 text-orange-400" />;
    if (category === 'report') return <FileSpreadsheet className="h-10 w-10 text-emerald-400" />;
    return <FileText className="h-10 w-10 text-muted-foreground" />;
}

export default function SharePage() {
    const { token } = useParams<{ token: string }>();
    const [sharedFile, setSharedFile] = useState<SharedFile | null>(null);
    const [fileUrl, setFileUrl] = useState<string | null>(null);
    const [status, setStatus] = useState<'loading' | 'valid' | 'expired' | 'exhausted' | 'error'>('loading');

    useEffect(() => {
        if (!token) { setStatus('error'); return; }
        loadSharedFile(token);
    }, [token]);

    const loadSharedFile = async (tok: string) => {
        try {
            // Fetch share link with file info
            const { data: link, error } = await (supabase as any)
                .from('shared_links')
                .select(`
          allow_download,
          download_count,
          max_downloads,
          expires_at,
          files (
            name, size, category, mime_type, storage_path
          )
        `)
                .eq('token', tok)
                .maybeSingle();

            if (error || !link) { setStatus('expired'); return; }

            // Check expiry (null = never expires)
            if (link.expires_at && new Date(link.expires_at) < new Date()) { setStatus('expired'); return; }

            // Check download count
            if (link.max_downloads !== null && link.download_count >= link.max_downloads) {
                setStatus('exhausted'); return;
            }

            const f = (link.files as unknown) as SharedFile;
            setSharedFile({
                ...f,
                allow_download: link.allow_download,
                download_count: link.download_count,
                max_downloads: link.max_downloads,
                expires_at: link.expires_at,
            });
            setStatus('valid');

            // Get presigned URL via Edge Function (no auth required — public share)
            const resp = await fetch(
                `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/s3-storage`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
                    },
                    body: JSON.stringify({ action: 'share-download', token: tok }),
                }
            );
            const json = await resp.json();
            if (json.downloadUrl) setFileUrl(json.downloadUrl);

        } catch {
            setStatus('error');
        }
    };

    const handleDownload = () => {
        if (!fileUrl || !sharedFile) return;
        const a = document.createElement('a');
        a.href = fileUrl;
        a.download = sharedFile.name;
        a.click();
    };

    // ── Status screens ──────────────────────────────────────────────────────────
    const StatusCard = ({ icon, title, message }: { icon: React.ReactNode; title: string; message: string }) => (
        <div className="min-h-screen bg-background flex items-center justify-center p-6">
            <div className="text-center space-y-4 max-w-md">
                <div className="flex justify-center">{icon}</div>
                <h1 className="text-2xl font-display font-bold text-foreground">{title}</h1>
                <p className="text-muted-foreground">{message}</p>
                <Link to="/">
                    <Button className="gradient-primary mt-4" style={{ color: 'hsl(222 47% 7%)' }}>
                        Go to Smart Cloud
                    </Button>
                </Link>
            </div>
        </div>
    );

    if (status === 'loading') {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="text-muted-foreground animate-pulse text-lg">Loading shared file…</div>
            </div>
        );
    }
    if (status === 'expired') return (
        <StatusCard
            icon={<Clock className="h-16 w-16 text-muted-foreground" />}
            title="Link Expired"
            message="This share link has expired. Ask the owner to create a new one."
        />
    );
    if (status === 'exhausted') return (
        <StatusCard
            icon={<Download className="h-16 w-16 text-muted-foreground" />}
            title="Download Limit Reached"
            message="This link has reached its maximum number of downloads."
        />
    );
    if (status === 'error' || !sharedFile) return (
        <StatusCard
            icon={<AlertCircle className="h-16 w-16 text-destructive" />}
            title="Link Not Found"
            message="This share link is invalid or has been revoked."
        />
    );

    const expiresIn = sharedFile.expires_at
        ? Math.round((new Date(sharedFile.expires_at).getTime() - Date.now()) / 1000 / 60 / 60)
        : null;
    const expiryLabel = expiresIn === null ? 'Never expires' : expiresIn < 24 ? `${expiresIn}h` : `${Math.round(expiresIn / 24)}d`;

    return (
        <div className="min-h-screen bg-background">
            {/* Nav */}
            <nav className="border-b border-border px-6 py-4 flex items-center gap-3" style={{ background: 'hsl(222 50% 5%)' }}>
                <div className="p-2 rounded-xl gradient-primary shadow-glow">
                    <Cloud className="h-5 w-5" style={{ color: 'hsl(222 47% 7%)' }} />
                </div>
                <span className="font-display font-bold text-white">Smart Cloud</span>
                <span className="ml-auto text-xs text-muted-foreground">Shared File</span>
            </nav>

            <main className="container max-w-2xl py-12">
                <div className="bg-card border border-border rounded-2xl p-8 space-y-6">

                    {/* File Info */}
                    <div className="flex items-start gap-5">
                        <div className="p-4 rounded-2xl bg-muted/40 border border-border shrink-0">
                            {getCategoryIcon(sharedFile.category, sharedFile.mime_type)}
                        </div>
                        <div className="min-w-0">
                            <h1 className="text-xl font-display font-bold text-foreground truncate">{sharedFile.name}</h1>
                            <p className="text-sm text-muted-foreground mt-1">{formatBytes(sharedFile.size)}</p>
                            <div className="flex flex-wrap gap-2 mt-3">
                                <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">
                                    <Clock className="h-3 w-3" />
                                    Expires in {expiryLabel}
                                </span>
                                {sharedFile.max_downloads && (
                                    <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-muted/60 text-muted-foreground border border-border">
                                        <Download className="h-3 w-3" />
                                        {sharedFile.download_count}/{sharedFile.max_downloads} downloads
                                    </span>
                                )}
                                {!sharedFile.allow_download && (
                                    <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                                        <Eye className="h-3 w-3" />
                                        View only
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Preview */}
                    {fileUrl && (
                        <div className="rounded-xl overflow-hidden border border-border bg-background">
                            {sharedFile.mime_type.startsWith('image/') && (
                                <img src={fileUrl} alt={sharedFile.name} className="w-full max-h-[500px] object-contain" />
                            )}
                            {sharedFile.mime_type.startsWith('audio/') && (
                                <div className="p-6">
                                    <audio controls className="w-full" src={fileUrl} />
                                </div>
                            )}
                            {sharedFile.mime_type.startsWith('video/') && (
                                <video controls className="w-full max-h-[400px]" src={fileUrl} />
                            )}
                            {sharedFile.mime_type === 'application/pdf' && (
                                sharedFile.allow_download ? (
                                    <iframe src={fileUrl} className="w-full h-[500px]" title={sharedFile.name} />
                                ) : (
                                    <div className="p-10 text-center space-y-3">
                                        <div className="text-4xl">🔒</div>
                                        <p className="font-semibold text-foreground">View Only — PDF Preview Restricted</p>
                                        <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                                            The owner has disabled downloading. PDF preview is not available in view-only mode to prevent browser-level downloads.
                                        </p>
                                    </div>
                                )
                            )}
                            {!['image/', 'audio/', 'video/', 'application/pdf'].some(t => sharedFile.mime_type.startsWith(t)) && (
                                <div className="p-8 text-center text-muted-foreground">
                                    <FileText className="h-12 w-12 mx-auto mb-3 opacity-40" />
                                    <p className="text-sm">Preview not available for this file type</p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-3">
                        {sharedFile.allow_download && (
                            <Button onClick={handleDownload} className="flex-1 gradient-primary font-semibold gap-2" style={{ color: 'hsl(222 47% 7%)' }}>
                                <Download className="h-4 w-4" />
                                Download File
                            </Button>
                        )}
                        {fileUrl && (
                            <Button variant="outline" className="gap-2 border-border" onClick={() => window.open(fileUrl, '_blank')}>
                                <ExternalLink className="h-4 w-4" />
                                Open in Tab
                            </Button>
                        )}
                    </div>

                    <p className="text-center text-xs text-muted-foreground">
                        Shared via{' '}
                        <Link to="/" className="text-primary hover:underline">Smart Cloud</Link>
                        {' '}— Secure AI-powered file storage
                    </p>
                </div>
            </main>
        </div>
    );
}

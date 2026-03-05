import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Copy, Check, Share2, Clock, Download, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { FileMetadata } from '@/hooks/useFiles';
import { supabase } from '@/integrations/supabase/client';

interface ShareModalProps {
    file: FileMetadata | null;
    onClose: () => void;
}

const EXPIRY_OPTIONS = [
    { label: 'No expiry (Unlimited)', value: 'never', hours: null },
    { label: '1 hour', value: '1h', hours: 1 },
    { label: '24 hours', value: '24h', hours: 24 },
    { label: '7 days', value: '7d', hours: 168 },
    { label: '30 days', value: '30d', hours: 720 },
];

const DOWNLOAD_OPTIONS = [
    { label: 'Unlimited', value: 'unlimited' },
    { label: '1 time', value: '1' },
    { label: '5 times', value: '5' },
    { label: '10 times', value: '10' },
];

export function ShareModal({ file, onClose }: ShareModalProps) {
    const [expiry, setExpiry] = useState('24h');
    const [maxDownloads, setMaxDownloads] = useState('unlimited');
    const [allowDownload, setAllowDownload] = useState(true);
    const [loading, setLoading] = useState(false);
    const [shareUrl, setShareUrl] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

    if (!file) return null;

    const handleCreate = async () => {
        setLoading(true);
        try {
            const expiryOption = EXPIRY_OPTIONS.find(o => o.value === expiry);
            const expiresAt = expiryOption?.hours
                ? new Date(Date.now() + expiryOption.hours * 60 * 60 * 1000).toISOString()
                : null; // null = no expiry
            const maxDl = maxDownloads === 'unlimited' ? null : parseInt(maxDownloads);

            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error('Not authenticated');

            const { data, error } = await (supabase as any)
                .from('shared_links')
                .insert({
                    file_id: file.id,
                    user_id: session.user.id,
                    expires_at: expiresAt,
                    max_downloads: maxDl,
                    allow_download: allowDownload,
                })
                .select('token')
                .single();

            if (error) throw error;

            const url = `${window.location.origin}/share/${data.token}`;
            setShareUrl(url);
        } catch (err: unknown) {
            toast.error((err as Error).message || 'Failed to create share link');
        } finally {
            setLoading(false);
        }
    };

    const handleCopy = () => {
        if (!shareUrl) return;
        navigator.clipboard.writeText(shareUrl);
        setCopied(true);
        toast.success('Link copied to clipboard!');
        setTimeout(() => setCopied(false), 2000);
    };

    const handleClose = () => {
        setShareUrl(null);
        setCopied(false);
        setExpiry('24h');
        setMaxDownloads('unlimited');
        setAllowDownload(true);
        onClose();
    };

    return (
        <Dialog open={!!file} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-md bg-card border-border">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-lg font-semibold">
                        <Share2 className="h-5 w-5 text-primary" />
                        Share File
                    </DialogTitle>
                    <DialogDescription className="text-muted-foreground text-sm">
                        Create a shareable link for <span className="text-foreground font-medium">{file.name}</span>
                    </DialogDescription>
                </DialogHeader>

                {/* Public access notice */}
                <div className="flex items-start gap-2 p-3 rounded-xl border border-primary/20 bg-primary/5">
                    <span className="text-lg">🔗</span>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                        <span className="text-primary font-semibold">Anyone with this link</span> can access this file — no login required. Share it with specific people only.
                    </p>
                </div>

                {!shareUrl ? (
                    <div className="space-y-5 pt-2">
                        {/* Expiry */}
                        <div className="space-y-2">
                            <Label className="flex items-center gap-2 text-sm font-medium">
                                <Clock className="h-4 w-4 text-primary" />
                                Link expires after
                            </Label>
                            <Select value={expiry} onValueChange={setExpiry}>
                                <SelectTrigger className="bg-background border-border">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {EXPIRY_OPTIONS.map(o => (
                                        <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Max downloads */}
                        <div className="space-y-2">
                            <Label className="flex items-center gap-2 text-sm font-medium">
                                <Download className="h-4 w-4 text-primary" />
                                Max downloads
                            </Label>
                            <Select value={maxDownloads} onValueChange={setMaxDownloads}>
                                <SelectTrigger className="bg-background border-border">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {DOWNLOAD_OPTIONS.map(o => (
                                        <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Allow download toggle */}
                        <div className="flex items-center justify-between py-2 px-3 rounded-xl bg-muted/40 border border-border">
                            <div className="flex items-center gap-2">
                                <Eye className="h-4 w-4 text-primary" />
                                <div>
                                    <p className="text-sm font-medium">Allow download</p>
                                    <p className="text-xs text-muted-foreground">
                                        {allowDownload ? 'Recipient can download the file' : 'View only — no download'}
                                    </p>
                                </div>
                            </div>
                            <Switch checked={allowDownload} onCheckedChange={setAllowDownload} />
                        </div>

                        <Button
                            onClick={handleCreate}
                            disabled={loading}
                            className="w-full gradient-primary font-semibold"
                            style={{ color: 'hsl(222 47% 7%)' }}
                        >
                            {loading ? 'Creating link…' : 'Create Share Link'}
                        </Button>
                    </div>
                ) : (
                    <div className="space-y-4 pt-2">
                        {/* Success state */}
                        <div className="p-4 rounded-xl border border-primary/20 bg-primary/5 text-center space-y-1">
                            <p className="text-sm font-semibold text-primary">Share link created! ✅</p>
                            <p className="text-xs text-muted-foreground">
                                Expires: {expiry === 'never' ? 'Never' : EXPIRY_OPTIONS.find(o => o.value === expiry)?.label} ·{' '}
                                {maxDownloads === 'unlimited' ? 'Unlimited downloads' : `${maxDownloads} download${Number(maxDownloads) > 1 ? 's' : ''}`} ·{' '}
                                {allowDownload ? 'Download allowed' : 'View only'}
                            </p>
                        </div>

                        <div className="flex gap-2">
                            <Input value={shareUrl} readOnly className="bg-background text-xs border-border" />
                            <Button size="icon" onClick={handleCopy} className="shrink-0 gradient-primary" style={{ color: 'hsl(222 47% 7%)' }}>
                                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                            </Button>
                        </div>

                        <Button variant="outline" className="w-full border-border" onClick={handleClose}>
                            Done
                        </Button>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}

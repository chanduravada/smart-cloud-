import { FileMetadata } from '@/hooks/useFiles';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import {
  FileText,
  Image,
  FileSpreadsheet,
  File,
  Download,
  Trash2,
  MoreVertical,
  Sparkles,
  Eye,
  Music,
  Video,
  Share2
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface FileCardProps {
  file: FileMetadata;
  onDownload: (file: FileMetadata) => void;
  onDelete: (fileId: string) => void;
  onPreview?: (file: FileMetadata) => void;
  onShare?: (file: FileMetadata) => void;
}

const getCategoryConfig = (category: string) => {
  switch (category) {
    case 'document':
      return {
        icon: <FileText className="h-5 w-5" />,
        badgeClass: 'bg-blue-500/10 text-blue-600 border-blue-200 dark:border-blue-800',
        iconClass: 'bg-blue-500/10 text-blue-500',
        borderClass: 'border-l-4 border-l-blue-500',
      };
    case 'image':
      return {
        icon: <Image className="h-5 w-5" />,
        badgeClass: 'bg-purple-500/10 text-purple-600 border-purple-200 dark:border-purple-800',
        iconClass: 'bg-purple-500/10 text-purple-500',
        borderClass: 'border-l-4 border-l-purple-500',
      };
    case 'report':
      return {
        icon: <FileSpreadsheet className="h-5 w-5" />,
        badgeClass: 'bg-emerald-500/10 text-emerald-600 border-emerald-200 dark:border-emerald-800',
        iconClass: 'bg-emerald-500/10 text-emerald-500',
        borderClass: 'border-l-4 border-l-emerald-500',
      };
    case 'audio':
      return {
        icon: <Music className="h-5 w-5" />,
        badgeClass: 'bg-orange-500/10 text-orange-600 border-orange-200 dark:border-orange-800',
        iconClass: 'bg-orange-500/10 text-orange-500',
        borderClass: 'border-l-4 border-l-orange-500',
      };
    case 'video':
      return {
        icon: <Video className="h-5 w-5" />,
        badgeClass: 'bg-rose-500/10 text-rose-600 border-rose-200 dark:border-rose-800',
        iconClass: 'bg-rose-500/10 text-rose-500',
        borderClass: 'border-l-4 border-l-rose-500',
      };
    default:
      return {
        icon: <File className="h-5 w-5" />,
        badgeClass: 'bg-amber-500/10 text-amber-600 border-amber-200 dark:border-amber-800',
        iconClass: 'bg-amber-500/10 text-amber-500',
        borderClass: 'border-l-4 border-l-amber-500',
      };
  }
};

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

export function FileCard({ file, onDownload, onDelete, onPreview, onShare }: FileCardProps) {
  const config = getCategoryConfig(file.category);

  return (
    <div className={cn(
      'group relative bg-card rounded-xl border border-border overflow-hidden',
      'hover:shadow-md hover:-translate-y-0.5 transition-all duration-200',
      config.borderClass
    )}>
      <div className="p-4">
        <div className="flex items-center gap-3">
          {/* File Icon */}
          <div className={cn('p-2.5 rounded-xl shrink-0', config.iconClass)}>
            {config.icon}
          </div>

          {/* File Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h3 className="font-medium text-sm truncate leading-tight" title={file.name}>
                  {file.name}
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {formatFileSize(file.size)} · {format(new Date(file.created_at), 'MMM d, yyyy')}
                </p>
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="shrink-0 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg"
                  >
                    <MoreVertical className="h-3.5 w-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-40">
                  {onPreview && (
                    <DropdownMenuItem onClick={() => onPreview(file)} className="gap-2 cursor-pointer">
                      <Eye className="h-3.5 w-3.5" />
                      Preview
                    </DropdownMenuItem>
                  )}
                  {onShare && (
                    <DropdownMenuItem onClick={() => onShare(file)} className="gap-2 cursor-pointer text-primary focus:text-primary">
                      <Share2 className="h-3.5 w-3.5" />
                      Share
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={() => onDownload(file)} className="gap-2 cursor-pointer">
                    <Download className="h-3.5 w-3.5" />
                    Download
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => onDelete(file.id)}
                    className="text-destructive focus:text-destructive gap-2 cursor-pointer"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Badges */}
            <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
              <Badge
                variant="outline"
                className={cn('text-xs capitalize font-medium border', config.badgeClass)}
              >
                {file.category}
              </Badge>

              {file.ai_classification && (
                <Badge variant="outline" className="text-xs gap-1 bg-primary/5 text-primary border-primary/20">
                  <Sparkles className="h-2.5 w-2.5" />
                  {Math.round(file.ai_classification.confidence * 100)}% AI
                </Badge>
              )}

              {file.tags.slice(0, 2).map((tag) => (
                <Badge key={tag} variant="secondary" className="text-xs">
                  {tag}
                </Badge>
              ))}

              {file.tags.length > 2 && (
                <span className="text-xs text-muted-foreground">
                  +{file.tags.length - 2}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

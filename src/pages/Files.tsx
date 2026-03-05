import { useState } from 'react';
import { Header } from '@/components/Header';
import { Sidebar } from '@/components/Sidebar';
import { FileCard } from '@/components/FileCard';
import { useFiles, FileFilters } from '@/hooks/useFiles';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  FolderOpen,
  Search,
  X,
  Grid,
  List,
  Cloud,
  Upload,
  Filter
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';
import { FilePreviewModal } from '@/components/FilePreviewModal';
import { ShareModal } from '@/components/ShareModal';
import { FileMetadata } from '@/hooks/useFiles';

type ViewMode = 'grid' | 'list';
type SortOrder = 'newest' | 'oldest' | 'name' | 'size';

export default function FilesPage() {
  const { files, loading, fetchFiles, downloadFile, deleteFile, getFileUrl } = useFiles();
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<string>('all');
  const [sortOrder, setSortOrder] = useState<SortOrder>('newest');
  const [previewFile, setPreviewFile] = useState<FileMetadata | null>(null);
  const [shareFile, setShareFile] = useState<FileMetadata | null>(null);

  const handleSearch = () => {
    fetchFiles({
      search: search || undefined,
      category: category !== 'all' ? category : undefined,
    });
  };

  const handleClearFilters = () => {
    setSearch('');
    setCategory('all');
    fetchFiles({});
  };

  const hasActiveFilters = search || category !== 'all';

  const sortedFiles = [...files].sort((a, b) => {
    switch (sortOrder) {
      case 'newest': return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      case 'oldest': return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      case 'name': return a.name.localeCompare(b.name);
      case 'size': return b.size - a.size;
      default: return 0;
    }
  });

  return (
    <div className="min-h-screen bg-background flex">
      <Sidebar />
      <div className="flex-1 ml-56 min-h-screen overflow-y-auto">

        <main className="container py-8">
          {/* Page Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <div className="p-2 rounded-xl gradient-primary">
                  <FolderOpen className="h-5 w-5 text-primary-foreground" />
                </div>
                <h1 className="text-3xl font-display font-bold">My Files</h1>
              </div>
              <p className="text-muted-foreground text-sm ml-0.5">
                {loading ? 'Loading...' : `${files.length} file${files.length !== 1 ? 's' : ''} stored`}
              </p>
            </div>

            {/* View Toggle */}
            <div className="flex items-center gap-1 p-1 bg-muted rounded-xl">
              <Button
                variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                size="icon"
                onClick={() => setViewMode('list')}
                className={cn('h-8 w-8 rounded-lg', viewMode === 'list' && 'shadow-sm')}
              >
                <List className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                size="icon"
                onClick={() => setViewMode('grid')}
                className={cn('h-8 w-8 rounded-lg', viewMode === 'grid' && 'shadow-sm')}
              >
                <Grid className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Search & Filters */}
          <div className="bg-card rounded-2xl border border-border p-4 mb-6">
            <div className="flex flex-col md:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search files by name or tag..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  className="pl-10 h-10 rounded-xl border-0 bg-muted/50 focus-visible:ring-1"
                />
              </div>

              <div className="flex gap-2 flex-wrap">
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger className="w-40 h-10 rounded-xl border-0 bg-muted/50">
                    <Filter className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    <SelectItem value="document">Documents</SelectItem>
                    <SelectItem value="image">Images</SelectItem>
                    <SelectItem value="report">Reports</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={sortOrder} onValueChange={(v) => setSortOrder(v as SortOrder)}>
                  <SelectTrigger className="w-32 h-10 rounded-xl border-0 bg-muted/50">
                    <SelectValue placeholder="Sort" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="newest">Newest</SelectItem>
                    <SelectItem value="oldest">Oldest</SelectItem>
                    <SelectItem value="name">Name</SelectItem>
                    <SelectItem value="size">Size</SelectItem>
                  </SelectContent>
                </Select>

                <Button onClick={handleSearch} className="gradient-primary h-10 px-5 rounded-xl gap-2">
                  <Search className="h-3.5 w-3.5" />
                  Search
                </Button>

                {hasActiveFilters && (
                  <Button variant="ghost" onClick={handleClearFilters} className="h-10 px-3 rounded-xl gap-1.5 text-muted-foreground">
                    <X className="h-3.5 w-3.5" />
                    Clear
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Files Grid/List */}
          {loading ? (
            <div className={cn(
              'gap-3',
              viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3' : 'flex flex-col'
            )}>
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Skeleton key={i} className="h-20 w-full rounded-xl shimmer" />
              ))}
            </div>
          ) : sortedFiles.length > 0 ? (
            <div className={cn(
              viewMode === 'grid'
                ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 stagger-children'
                : 'flex flex-col gap-3 stagger-children'
            )}>
              {sortedFiles.map((file) => (
                <FileCard
                  key={file.id}
                  file={file}
                  onDownload={downloadFile}
                  onDelete={deleteFile}
                  onPreview={setPreviewFile}
                  onShare={setShareFile}
                />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <div className="w-20 h-20 rounded-3xl gradient-hero flex items-center justify-center mx-auto mb-6">
                <Cloud className="h-10 w-10 text-primary-foreground/60" />
              </div>
              <h3 className="text-xl font-semibold mb-2">
                {hasActiveFilters ? 'No files match your search' : 'No files yet'}
              </h3>
              <p className="text-muted-foreground text-sm max-w-sm mb-6">
                {hasActiveFilters
                  ? 'Try adjusting your search terms or removing filters to see more files.'
                  : 'Upload your first file to get started with AI-powered file management.'}
              </p>
              {!hasActiveFilters && (
                <Link to="/upload">
                  <Button className="gradient-primary gap-2">
                    <Upload className="h-4 w-4" />
                    Upload Files
                  </Button>
                </Link>
              )}
              {hasActiveFilters && (
                <Button variant="outline" onClick={handleClearFilters} className="gap-2">
                  <X className="h-4 w-4" />
                  Clear Filters
                </Button>
              )}
            </div>
          )}
        </main>
      </div>
      <FilePreviewModal
        file={previewFile}
        onClose={() => setPreviewFile(null)}
        onDownload={downloadFile}
        getUrl={getFileUrl}
      />
      <ShareModal
        file={shareFile}
        onClose={() => setShareFile(null)}
      />
    </div>
  );
}

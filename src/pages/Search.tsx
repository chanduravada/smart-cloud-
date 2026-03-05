import { useState } from 'react';
import { Header } from '@/components/Header';
import { Sidebar } from '@/components/Sidebar';
import { FileCard } from '@/components/FileCard';
import { useFiles, FileFilters } from '@/hooks/useFiles';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, Sparkles, Cloud, Clock, Tag, FileType } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function SearchPage() {
  const { files, loading, fetchFiles, downloadFile, deleteFile } = useFiles();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<string>('all');
  const [fileType, setFileType] = useState<string>('all');
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = () => {
    setHasSearched(true);
    fetchFiles({
      search: search || undefined,
      category: category !== 'all' ? category : undefined,
      fileType: fileType !== 'all' ? fileType : undefined,
    });
  };

  const suggestions = [
    'invoices',
    'reports',
    'images',
    'documents',
    'spreadsheets',
  ];

  const handleSuggestionClick = (suggestion: string) => {
    setSearch(suggestion);
    setHasSearched(true);
    fetchFiles({ search: suggestion });
  };

  return (
    <div className="min-h-screen bg-background flex">
      <Sidebar />
      <div className="flex-1 ml-56">
        <main className="container py-8 max-w-4xl">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-display font-bold flex items-center justify-center gap-3">
              <Search className="h-8 w-8 text-primary" />
              Intelligent Search
            </h1>
            <p className="text-muted-foreground mt-2">
              Find files using semantic search and AI-powered tags
            </p>
          </div>

          {/* Search Box */}
          <Card className="mb-8">
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Sparkles className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary" />
                    <Input
                      placeholder="Search by name, tags, keywords..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                      className="pl-10 h-12 text-lg"
                    />
                  </div>
                  <Button onClick={handleSearch} className="gradient-primary h-12 px-8">
                    <Search className="h-5 w-5 mr-2" />
                    Search
                  </Button>
                </div>

                {/* Filters */}
                <div className="flex flex-wrap gap-4">
                  <div className="flex items-center gap-2">
                    <Tag className="h-4 w-4 text-muted-foreground" />
                    <Select value={category} onValueChange={setCategory}>
                      <SelectTrigger className="w-40">
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
                  </div>

                  <div className="flex items-center gap-2">
                    <FileType className="h-4 w-4 text-muted-foreground" />
                    <Select value={fileType} onValueChange={setFileType}>
                      <SelectTrigger className="w-32">
                        <SelectValue placeholder="Type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Types</SelectItem>
                        <SelectItem value="pdf">PDF</SelectItem>
                        <SelectItem value="docx">DOCX</SelectItem>
                        <SelectItem value="txt">TXT</SelectItem>
                        <SelectItem value="png">PNG</SelectItem>
                        <SelectItem value="jpg">JPG</SelectItem>
                        <SelectItem value="xlsx">XLSX</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Quick Suggestions */}
                {!hasSearched && (
                  <div className="flex flex-wrap gap-2 pt-2">
                    <span className="text-sm text-muted-foreground">Try:</span>
                    {suggestions.map((suggestion) => (
                      <Badge
                        key={suggestion}
                        variant="secondary"
                        className="cursor-pointer hover:bg-primary/10 transition-colors"
                        onClick={() => handleSuggestionClick(suggestion)}
                      >
                        {suggestion}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Results */}
          {hasSearched && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-muted-foreground">
                  {loading ? 'Searching...' : `${files.length} result${files.length !== 1 ? 's' : ''} found`}
                </p>
              </div>

              {loading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-24 w-full" />
                  ))}
                </div>
              ) : files.length > 0 ? (
                <div className="space-y-4">
                  {files.map((file) => (
                    <FileCard
                      key={file.id}
                      file={file}
                      onDownload={downloadFile}
                      onDelete={deleteFile}
                    />
                  ))}
                </div>
              ) : (
                <Card className="py-12">
                  <CardContent className="text-center">
                    <Cloud className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium mb-2">No results found</h3>
                    <p className="text-muted-foreground">
                      Try different keywords or adjust your filters
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Features Info */}
          {!hasSearched && (
            <div className="grid md:grid-cols-3 gap-4 mt-8">
              <Card className="bg-muted/30">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Sparkles className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-medium">Semantic Search</h4>
                      <p className="text-sm text-muted-foreground mt-1">
                        Find files by meaning, not just exact matches
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-muted/30">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-accent/10">
                      <Tag className="h-5 w-5 text-accent" />
                    </div>
                    <div>
                      <h4 className="font-medium">AI Tags</h4>
                      <p className="text-sm text-muted-foreground mt-1">
                        Search by auto-generated tags and categories
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-muted/30">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-success/10">
                      <Clock className="h-5 w-5 text-success" />
                    </div>
                    <div>
                      <h4 className="font-medium">Fast Results</h4>
                      <p className="text-sm text-muted-foreground mt-1">
                        Indexed search for instant results
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

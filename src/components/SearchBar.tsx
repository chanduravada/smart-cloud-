import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, Filter, X } from 'lucide-react';
import { FileFilters } from '@/hooks/useFiles';

interface SearchBarProps {
  onSearch: (filters: FileFilters) => void;
}

export function SearchBar({ onSearch }: SearchBarProps) {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<string>('all');
  const [fileType, setFileType] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);

  const handleSearch = () => {
    onSearch({
      search: search || undefined,
      category: category !== 'all' ? category : undefined,
      fileType: fileType !== 'all' ? fileType : undefined,
    });
  };

  const handleClear = () => {
    setSearch('');
    setCategory('all');
    setFileType('all');
    onSearch({});
  };

  const hasActiveFilters = search || category !== 'all' || fileType !== 'all';

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search files by name, tags, or keywords..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="pl-10"
          />
        </div>
        
        <Button onClick={handleSearch} className="gradient-primary shrink-0">
          <Search className="h-4 w-4 mr-2" />
          Search
        </Button>
        
        <Button 
          variant="outline" 
          onClick={() => setShowFilters(!showFilters)}
          className={showFilters ? 'border-primary' : ''}
        >
          <Filter className="h-4 w-4" />
        </Button>
        
        {hasActiveFilters && (
          <Button variant="ghost" onClick={handleClear}>
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
      
      {showFilters && (
        <div className="flex flex-wrap gap-4 p-4 bg-muted/30 rounded-lg animate-slide-up">
          <div className="space-y-2">
            <label className="text-sm font-medium">Category</label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="All categories" />
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
          
          <div className="space-y-2">
            <label className="text-sm font-medium">File Type</label>
            <Select value={fileType} onValueChange={setFileType}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="All types" />
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
      )}
    </div>
  );
}

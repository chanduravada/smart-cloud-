import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { useFiles, FileFilters, FileMetadata } from '@/hooks/useFiles';
import { useProfile } from '@/hooks/useProfile';
import { Header } from '@/components/Header';
import { Sidebar } from '@/components/Sidebar';
import { FileCard } from '@/components/FileCard';
import { FileUploader } from '@/components/FileUploader';
import { SearchBar } from '@/components/SearchBar';
import { StorageIndicator } from '@/components/StorageIndicator';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Cloud,
  Upload,
  FileText,
  Image,
  FileSpreadsheet,
  File,
  Sparkles,
  TrendingUp,
  Shield,
  ArrowRight,
  Music,
  Video
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { FilePreviewModal } from '@/components/FilePreviewModal';

export default function Dashboard() {
  const { user } = useAuth();
  const { files, loading, uploading, uploadFile, downloadFile, deleteFile, fetchFiles, getFileUrl } = useFiles();
  const { profile } = useProfile();
  const [previewFile, setPreviewFile] = useState<FileMetadata | null>(null);

  // Stats
  const totalFiles = files.length;
  const documentCount = files.filter(f => f.category === 'document').length;
  const imageCount = files.filter(f => f.category === 'image').length;
  const reportCount = files.filter(f => f.category === 'report').length;
  const audioCount = files.filter(f => f.category === 'audio').length;
  const videoCount = files.filter(f => f.category === 'video').length;
  const recentFiles = files.slice(0, 4);

  const stats = [
    {
      label: 'Total Files',
      value: totalFiles,
      icon: File,
      gradient: 'from-blue-500 to-blue-700',
      bg: 'bg-blue-500/10',
      color: 'text-blue-500',
      description: 'All files'
    },
    {
      label: 'Documents',
      value: documentCount,
      icon: FileText,
      gradient: 'from-violet-500 to-violet-700',
      bg: 'bg-violet-500/10',
      color: 'text-violet-500',
      description: 'PDFs & docs'
    },
    {
      label: 'Images',
      value: imageCount,
      icon: Image,
      gradient: 'from-purple-500 to-pink-600',
      bg: 'bg-purple-500/10',
      color: 'text-purple-500',
      description: 'Photos & art'
    },
    {
      label: 'Reports',
      value: reportCount,
      icon: FileSpreadsheet,
      gradient: 'from-emerald-500 to-teal-600',
      bg: 'bg-emerald-500/10',
      color: 'text-emerald-500',
      description: 'Spreadsheets'
    },
    {
      label: 'Audio',
      value: audioCount,
      icon: Music,
      gradient: 'from-orange-500 to-amber-600',
      bg: 'bg-orange-500/10',
      color: 'text-orange-500',
      description: 'Music & audio'
    },
    {
      label: 'Video',
      value: videoCount,
      icon: Video,
      gradient: 'from-rose-500 to-red-600',
      bg: 'bg-rose-500/10',
      color: 'text-rose-500',
      description: 'Videos & clips'
    },
  ];

  const firstName = profile?.full_name?.split(' ')[0] || '';

  return (
    <div className="min-h-screen bg-background flex">
      <Sidebar />
      <div className="flex-1 ml-56 min-h-screen overflow-y-auto">

        <main className="container py-8">
          {/* Welcome Section */}
          <div className="mb-8 animate-fade-in">
            <h1 className="text-3xl font-display font-bold">
              {firstName ? (
                <>Welcome back, <span className="text-primary">{firstName}</span>! 👋</>
              ) : (
                'Welcome back! 👋'
              )}
            </h1>
            <p className="text-muted-foreground mt-1">
              Manage your files with AI-powered organization
            </p>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8 stagger-children">
            {stats.map((stat, i) => {
              const Icon = stat.icon;
              return (
                <div
                  key={stat.label}
                  className="group relative bg-card rounded-2xl border border-border p-5 overflow-hidden hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5 animate-scale-in"
                >
                  {/* Background glow */}
                  <div className={`absolute inset-0 bg-gradient-to-br ${stat.gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-300`} />

                  <div className="relative flex items-start justify-between">
                    <div>
                      <p className="text-3xl font-display font-bold">{stat.value}</p>
                      <p className="text-sm font-medium mt-0.5">{stat.label}</p>
                      <p className="text-xs text-muted-foreground">{stat.description}</p>
                    </div>
                    <div className={`p-2.5 rounded-xl ${stat.bg}`}>
                      <Icon className={`h-5 w-5 ${stat.color}`} />
                    </div>
                  </div>

                  {/* Bottom gradient bar */}
                  <div className={`absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r ${stat.gradient} opacity-50 group-hover:opacity-100 transition-opacity`} />
                </div>
              );
            })}
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {/* Left Column - Upload & Recent Files */}
            <div className="md:col-span-2 space-y-6">
              {/* Quick Upload */}
              <Card className="border-dashed border-2 hover:border-primary/40 transition-colors duration-300">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <div className="p-1.5 rounded-lg gradient-primary">
                      <Upload className="h-4 w-4 text-primary-foreground" />
                    </div>
                    Quick Upload
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <FileUploader onUpload={uploadFile} uploading={uploading} />
                </CardContent>
              </Card>

              {/* Recent Files */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-4">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <div className="p-1.5 rounded-lg bg-primary/10">
                      <FileText className="h-4 w-4 text-primary" />
                    </div>
                    Recent Files
                  </CardTitle>
                  <Link to="/files">
                    <Button variant="ghost" size="sm" className="gap-1.5 text-primary hover:text-primary hover:bg-primary/10">
                      View All
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Button>
                  </Link>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="space-y-3">
                      {[1, 2, 3].map((i) => (
                        <Skeleton key={i} className="h-20 w-full rounded-xl shimmer" />
                      ))}
                    </div>
                  ) : recentFiles.length > 0 ? (
                    <div className="space-y-3">
                      {recentFiles.map((file) => (
                        <FileCard
                          key={file.id}
                          file={file}
                          onDownload={downloadFile}
                          onDelete={deleteFile}
                          onPreview={setPreviewFile}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
                        <Cloud className="h-8 w-8 text-muted-foreground" />
                      </div>
                      <p className="font-medium text-sm">No files yet</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Upload your first file to get started
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Right Column */}
            <div className="space-y-5">
              {/* Storage */}
              <StorageIndicator />

              {/* AI Features Card */}
              <Card className="overflow-hidden">
                <div className="h-1 w-full gradient-primary" />
                <CardContent className="pt-5 space-y-4">
                  <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                    Powered by AI
                  </p>

                  <div className="flex items-start gap-3 group">
                    <div className="p-2.5 rounded-xl bg-primary/10 shrink-0 group-hover:bg-primary/20 transition-colors">
                      <Sparkles className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-sm">AI Classification</h4>
                      <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                        Files auto-categorized using machine learning
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 group">
                    <div className="p-2.5 rounded-xl bg-cyan-500/10 shrink-0 group-hover:bg-cyan-500/20 transition-colors">
                      <TrendingUp className="h-4 w-4 text-cyan-500" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-sm">Smart Search</h4>
                      <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                        Intelligent semantic search across all files
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 group">
                    <div className="p-2.5 rounded-xl bg-emerald-500/10 shrink-0 group-hover:bg-emerald-500/20 transition-colors">
                      <Shield className="h-4 w-4 text-emerald-500" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-sm">Duplicate Detection</h4>
                      <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                        SHA-256 hashing prevents duplicate uploads
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Quick Search Card */}
              <Card className="bg-gradient-to-br from-primary/5 to-accent/5 border-primary/10">
                <CardContent className="pt-5">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="p-1.5 rounded-lg gradient-primary">
                      <Shield className="h-3.5 w-3.5 text-primary-foreground" />
                    </div>
                    <p className="text-sm font-semibold">Quick Search</p>
                  </div>
                  <p className="text-xs text-muted-foreground mb-3">Find any file instantly</p>
                  <Link to="/search">
                    <Button className="w-full gradient-primary gap-2 text-sm" size="sm">
                      Open Search
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </div>

      <FilePreviewModal
        file={previewFile}
        onClose={() => setPreviewFile(null)}
        onDownload={downloadFile}
        getUrl={getFileUrl}
      />
    </div>
  );
}

import { Header } from '@/components/Header';
import { Sidebar } from '@/components/Sidebar';
import { FileUploader } from '@/components/FileUploader';
import { StorageIndicator } from '@/components/StorageIndicator';
import { useFiles } from '@/hooks/useFiles';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Upload, Sparkles, Shield, Clock } from 'lucide-react';

export default function UploadPage() {
  const { uploadFile, uploading } = useFiles();

  const features = [
    {
      icon: Sparkles,
      title: 'AI Classification',
      description: 'Files are automatically categorized and tagged using AI',
    },
    {
      icon: Shield,
      title: 'Duplicate Detection',
      description: 'SHA-256 hashing prevents uploading duplicate files',
    },
    {
      icon: Clock,
      title: 'Instant Processing',
      description: 'Files are processed and available immediately',
    },
  ];

  return (
    <div className="min-h-screen bg-background flex">
      <Sidebar />
      <div className="flex-1 ml-56">
        <main className="container py-8 max-w-4xl">
          <div className="mb-8">
            <h1 className="text-3xl font-display font-bold flex items-center gap-3">
              <Upload className="h-8 w-8 text-primary" />
              Upload Files
            </h1>
            <p className="text-muted-foreground mt-1">
              Drag and drop files or click to browse
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 mb-8">
            <div className="md:col-span-2">
              <Card>
                <CardContent className="pt-6">
                  <FileUploader onUpload={uploadFile} uploading={uploading} />
                </CardContent>
              </Card>
            </div>

            <div>
              <StorageIndicator />
            </div>
          </div>

          {/* Features */}
          <div className="grid md:grid-cols-3 gap-4">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <Card key={feature.title} className="bg-muted/30">
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-primary/10 shrink-0">
                        <Icon className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h4 className="font-medium">{feature.title}</h4>
                        <p className="text-sm text-muted-foreground mt-1">
                          {feature.description}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Supported File Types */}
          <Card className="mt-8">
            <CardHeader>
              <CardTitle className="text-lg">Supported File Types</CardTitle>
              <CardDescription>
                Upload files up to 50MB in the following formats
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 bg-muted/30 rounded-lg text-center">
                  <p className="font-medium">Documents</p>
                  <p className="text-sm text-muted-foreground">PDF, DOC, DOCX, TXT</p>
                </div>
                <div className="p-4 bg-muted/30 rounded-lg text-center">
                  <p className="font-medium">Images</p>
                  <p className="text-sm text-muted-foreground">JPG, PNG, GIF, WEBP</p>
                </div>
                <div className="p-4 bg-muted/30 rounded-lg text-center">
                  <p className="font-medium">Spreadsheets</p>
                  <p className="text-sm text-muted-foreground">XLS, XLSX</p>
                </div>
                <div className="p-4 bg-muted/30 rounded-lg text-center">
                  <p className="font-medium">Max Size</p>
                  <p className="text-sm text-muted-foreground">50MB per file</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
}

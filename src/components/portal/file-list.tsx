'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, Download } from 'lucide-react';
import { toast } from 'sonner';

type FileItem = {
  id: string;
  name: string;
  size: number;
  mimeType: string;
  createdAt: string;
  uploaderName: string | null;
};

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function FileList({
  files,
  projectId,
}: {
  files: FileItem[];
  projectId: string;
}) {
  async function handleDownload(fileId: string, fileName: string) {
    try {
      const res = await fetch(
        `/api/projects/${projectId}/files/${fileId}/download`,
      );
      if (!res.ok) throw new Error('Failed to get download URL');
      const { url } = await res.json();
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
    } catch {
      toast.error('Download failed');
    }
  }

  return (
    <div className="space-y-2">
      {files.map((file) => (
        <Card key={file.id}>
          <CardContent className="flex items-center gap-4 py-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-muted">
              <FileText className="size-5 text-muted-foreground" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-foreground">
                {file.name}
              </p>
              <p className="text-xs text-muted-foreground">
                {formatSize(file.size)} &middot; {file.createdAt}
                {file.uploaderName && <> &middot; by {file.uploaderName}</>}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => handleDownload(file.id, file.name)}
              className="text-muted-foreground hover:text-foreground"
            >
              <Download className="size-4" />
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

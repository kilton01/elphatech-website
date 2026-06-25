'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';
import Link from 'next/link';

export default function ProjectError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Project error:', error.message);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
      <div className="flex size-12 items-center justify-center rounded-full bg-red/10">
        <AlertTriangle className="size-6 text-red" />
      </div>
      <div className="text-center">
        <h2 className="text-lg font-semibold text-white">Project not found</h2>
        <p className="mt-1 text-sm text-slate">
          This project may not exist or you may not have access.
        </p>
      </div>
      <div className="flex gap-3">
        <Button onClick={reset} variant="outline" className="border-brand text-slate hover:text-white">
          Try again
        </Button>
        <Link href="/portal/projects">
          <Button className="bg-red text-white hover:bg-red2">
            Back to projects
          </Button>
        </Link>
      </div>
    </div>
  );
}

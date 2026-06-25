'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';

export default function PortalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Portal error:', error.message);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
      <div className="flex size-12 items-center justify-center rounded-full bg-red/10">
        <AlertTriangle className="size-6 text-red" />
      </div>
      <div className="text-center">
        <h2 className="text-lg font-semibold text-white">Something went wrong</h2>
        <p className="mt-1 text-sm text-slate">
          An unexpected error occurred. Please try again.
        </p>
      </div>
      <Button onClick={reset} className="bg-red text-white hover:bg-red2">
        Try again
      </Button>
    </div>
  );
}

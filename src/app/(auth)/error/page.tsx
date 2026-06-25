import { AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function AuthErrorPage() {
  return (
    <div className="w-full max-w-sm space-y-6 text-center">
      <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-danger">
        <AlertTriangle className="size-6 text-danger" />
      </div>
      <div>
        <h1 className="text-2xl font-bold text-white font-[var(--font-sora)]">
          Authentication Error
        </h1>
        <p className="mt-2 text-sm text-secondary-brand">
          Something went wrong while signing in.
        </p>
      </div>
      <div className="rounded-lg border border-brand bg-surface-2 p-4 text-left">
        <p className="text-xs text-tertiary leading-relaxed">
          The sign-in link may have expired or is invalid. Please request a new one.
        </p>
      </div>
      <Link href="/login">
        <Button className="bg-red text-white hover:bg-red2 transition-all active:scale-[0.98]">
          Try again
        </Button>
      </Link>
    </div>
  );
}

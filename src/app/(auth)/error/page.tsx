import { AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

const errorMessages: Record<string, { title: string; message: string }> = {
  Verification: {
    title: 'Link Expired',
    message: 'This login link has expired or has already been used. Please request a new one.',
  },
  AccessDenied: {
    title: 'Access Denied',
    message: 'Your account does not have access to this portal.',
  },
  Configuration: {
    title: 'Configuration Error',
    message: 'There is a problem with the server configuration. Please contact support.',
  },
  Default: {
    title: 'Sign In Failed',
    message: 'Something went wrong during sign in. Please try again.',
  },
};

export default async function AuthErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const errorInfo = errorMessages[error || ''] || errorMessages.Default;

  return (
    <div className="w-full max-w-sm space-y-6 text-center">
      <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-danger/10">
        <AlertCircle className="size-6 text-danger" />
      </div>
      <div>
        <h1 className="text-2xl font-bold text-white font-[var(--font-sora)]">
          {errorInfo.title}
        </h1>
        <p className="mt-2 text-sm text-secondary-brand">
          {errorInfo.message}
        </p>
      </div>
      <div className="space-y-3">
        <Link href="/login" className="block">
          <Button className="w-full bg-red text-white hover:bg-red2 transition-all active:scale-[0.98]">
            Request a New Login Link
          </Button>
        </Link>
        <a
          href="mailto:info@elphatechsolutions.com"
          className="inline-block text-xs text-slate hover:text-white transition-colors"
        >
          Need help? Contact support
        </a>
      </div>
    </div>
  );
}

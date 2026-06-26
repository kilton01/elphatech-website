import { Mail } from 'lucide-react';
import Link from 'next/link';

export default function VerifyRequestPage() {
  return (
    <div className="w-full max-w-sm space-y-6 text-center">
      <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-brand-muted">
        <Mail className="size-6 text-red" />
      </div>
      <div>
        <h1 className="text-2xl font-bold text-white font-[var(--font-sora)]">
          Check your email
        </h1>
        <p className="mt-2 text-sm text-secondary-brand">
          A sign-in link has been sent to your email address.
        </p>
      </div>
      <div className="rounded-lg border border-brand bg-surface-2 p-4 text-left">
        <p className="text-xs text-tertiary leading-relaxed">
          Click the link in the email to sign in. If you don&apos;t see it, check your spam folder.
        </p>
        <p className="mt-2 text-xs text-tertiary leading-relaxed">
          Links expire after 24 hours and can only be used once. If your link doesn&apos;t work, request a new one from the login page.
        </p>
      </div>
      <Link
        href="/login"
        className="inline-flex items-center gap-1.5 text-sm text-slate transition-colors hover:text-white"
      >
        &larr; Back to login
      </Link>
    </div>
  );
}

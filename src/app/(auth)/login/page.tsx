'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Mail, ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const result = await signIn('email', { email, redirect: false });
      if (result?.error) {
        setError('Something went wrong. Please try again.');
      } else {
        setSent(true);
      }
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
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
            We sent a sign-in link to{' '}
            <span className="font-medium text-white">{email}</span>
          </p>
        </div>
        <div className="rounded-lg border border-brand bg-surface-2 p-4 text-left">
          <p className="text-xs text-tertiary leading-relaxed">
            Click the link in the email to sign in. The link expires in 15 minutes.
            If you don&apos;t see it, check your spam folder.
          </p>
        </div>
        <button
          onClick={() => setSent(false)}
          className="inline-flex items-center gap-1.5 text-sm text-slate transition-colors hover:text-white"
        >
          <ArrowLeft className="size-3.5" />
          Try a different email
        </button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-sm space-y-8">
      <div className="text-center lg:text-left">
        <h1 className="text-2xl font-bold text-white font-[var(--font-sora)]">
          Sign in
        </h1>
        <p className="mt-2 text-sm text-secondary-brand">
          Enter your email to receive a magic link
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="email" className="text-sm font-medium text-text-primary">
            Email address
          </Label>
          <Input
            id="email"
            type="email"
            placeholder="you@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoFocus
            className="h-12 bg-surface-2 border-brand text-white placeholder:text-tertiary focus:shadow-glow focus:border-transparent transition-shadow"
          />
        </div>

        {error && (
          <div className="rounded-md border border-red/20 bg-danger p-3">
            <p className="text-sm text-danger">{error}</p>
          </div>
        )}

        <Button
          type="submit"
          disabled={loading || !email}
          className="h-12 w-full bg-red text-white font-semibold hover:bg-red2 transition-all active:scale-[0.98] disabled:opacity-50"
        >
          {loading ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            'Send magic link'
          )}
        </Button>
      </form>

<p className="text-center text-xs text-tertiary">
        <Link href="/" className="transition-colors hover:text-white">
          &larr; Back to home
        </Link>
      </p>
    </div>
  );
}

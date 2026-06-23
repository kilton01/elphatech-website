'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await signIn('email', { email, redirect: false });
      setSent(true);
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-center text-2xl font-bold text-white">
            Check your email
          </CardTitle>
          <CardDescription className="text-center text-slate">
            We sent a sign-in link to <span className="font-medium text-white">{email}</span>
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center text-sm text-slate">
          <p>Click the link in the email to sign in. It expires in 24 hours.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl font-bold text-white">
          ElphaTech
        </CardTitle>
        <CardDescription className="text-slate">
          Sign in to the client portal
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-white">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="bg-navy2 border-brand text-white placeholder:text-slate"
            />
          </div>
          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-red text-white hover:bg-red2"
          >
            {loading ? 'Sending…' : 'Send Magic Link'}
          </Button>
        </form>
        <p className="mt-4 text-center text-xs text-slate">
          <a href="/" className="underline hover:text-white">Back to home</a>
        </p>
      </CardContent>
    </Card>
  );
}

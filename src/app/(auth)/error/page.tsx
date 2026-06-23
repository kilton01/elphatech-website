import { AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function AuthErrorPage() {
  return (
    <Card className="w-full max-w-sm text-center">
      <CardHeader>
        <div className="mx-auto mb-2 flex size-12 items-center justify-center rounded-full bg-navy2">
          <AlertTriangle className="size-6 text-red" />
        </div>
        <CardTitle className="text-2xl font-bold text-white">
          Authentication Error
        </CardTitle>
        <CardDescription className="text-slate">
          Something went wrong while signing in.
        </CardDescription>
      </CardHeader>
      <CardContent className="text-sm text-slate space-y-3">
        <p>
          The sign-in link may have expired or is invalid. Please request a new one.
        </p>
        <a
          href="/login"
          className="inline-block rounded-lg bg-red px-4 py-2 text-sm font-medium text-white hover:bg-red2"
        >
          Try Again
        </a>
      </CardContent>
    </Card>
  );
}

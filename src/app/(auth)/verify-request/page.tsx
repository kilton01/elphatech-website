import { Mail } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function VerifyRequestPage() {
  return (
    <Card className="w-full max-w-sm text-center">
      <CardHeader>
        <div className="mx-auto mb-2 flex size-12 items-center justify-center rounded-full bg-navy2">
          <Mail className="size-6 text-red" />
        </div>
        <CardTitle className="text-2xl font-bold text-white">
          Check your email
        </CardTitle>
        <CardDescription className="text-slate">
          A sign-in link has been sent to your email address.
        </CardDescription>
      </CardHeader>
      <CardContent className="text-sm text-slate">
        <p>
          Click the link in the email to sign in. If you don&apos;t see it, check your spam folder.
          The link expires in 24 hours.
        </p>
      </CardContent>
    </Card>
  );
}

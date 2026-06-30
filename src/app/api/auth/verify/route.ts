import { type NextRequest, NextResponse } from 'next/server';
import { createHash } from 'crypto';
import { db } from '@/lib/db';
import { verificationTokens } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token');

  if (!token) {
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    return NextResponse.redirect(`${baseUrl}/error?error=Verification`);
  }

  const hashedToken = createHash('sha256')
    .update(`${token}${process.env.AUTH_SECRET}`)
    .digest('hex');

  const record = await db
    .select({ identifier: verificationTokens.identifier })
    .from(verificationTokens)
    .where(eq(verificationTokens.token, hashedToken))
    .then(rows => rows[0] ?? null);

  if (!record) {
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    return NextResponse.redirect(`${baseUrl}/error?error=Verification`);
  }

  const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
  const callbackUrl = new URL('/api/auth/callback/email', baseUrl);
  callbackUrl.searchParams.set('token', token);
  callbackUrl.searchParams.set('email', record.identifier);
  callbackUrl.searchParams.set('callbackUrl', `${baseUrl}/portal`);

  const redirectUrl = callbackUrl.toString();

  return new NextResponse(
    `<!DOCTYPE html>
<html>
<head>
<meta http-equiv="refresh" content="0;url=${redirectUrl}">
<title>Signing you in...</title>
</head>
<body>
<p>Signing you in...</p>
<script>window.location.href="${redirectUrl}";</script>
</body>
</html>`,
    {
      headers: { 'Content-Type': 'text/html' },
    },
  );
}

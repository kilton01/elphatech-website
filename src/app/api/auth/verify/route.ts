import { type NextRequest, NextResponse } from 'next/server';
import { createHash } from 'crypto';
import { db } from '@/lib/db';
import { verificationTokens } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token');

  if (!token) {
    return NextResponse.redirect(new URL('/error?error=Verification', request.url));
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
    return NextResponse.redirect(new URL('/error?error=Verification', request.url));
  }

  const callbackUrl = new URL('/api/auth/callback/email', request.url);
  callbackUrl.searchParams.set('token', token);
  callbackUrl.searchParams.set('email', record.identifier);
  callbackUrl.searchParams.set('callbackUrl', `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/portal`);

  return NextResponse.redirect(callbackUrl);
}

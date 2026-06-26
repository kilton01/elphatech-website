import { type NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token');
  const email = searchParams.get('email');

  if (!token || !email) {
    return NextResponse.redirect(new URL('/error?error=Verification', request.url));
  }

  const callbackUrl = new URL('/api/auth/callback/email', request.url);
  callbackUrl.searchParams.set('token', token);
  callbackUrl.searchParams.set('email', email);
  callbackUrl.searchParams.set('callbackUrl', `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/portal`);

  return NextResponse.redirect(callbackUrl);
}

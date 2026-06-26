import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const token = searchParams.get('token');
  const email = searchParams.get('email');
  const callbackUrl = searchParams.get('callbackUrl');

  if (!token || !email) {
    return NextResponse.redirect(new URL('/error?error=Verification', request.url));
  }

  const params = new URLSearchParams({ token, email });
  if (callbackUrl) params.set('callbackUrl', callbackUrl);

  return NextResponse.redirect(
    new URL(`/api/auth/callback/email?${params.toString()}`, request.url),
  );
}

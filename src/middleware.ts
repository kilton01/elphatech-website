import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

const PUBLIC_API_ROUTES = ['/api/auth', '/api/contact'];
const MUTATION_METHODS = ['POST', 'PUT', 'PATCH', 'DELETE'];

function isPublicApiRoute(pathname: string) {
  return PUBLIC_API_ROUTES.some((route) => pathname.startsWith(route));
}

function addSecurityHeaders(response: NextResponse) {
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set(
    'Strict-Transport-Security',
    'max-age=31536000; includeSubDomains',
  );
  return response;
}

function checkCsrf(request: NextRequest): boolean {
  if (!MUTATION_METHODS.includes(request.method)) return true;
  const origin = request.headers.get('origin');
  const host = request.headers.get('host');
  if (!origin || !host) return false;
  const originHost = new URL(origin).host;
  return originHost === host;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // CSRF check on all mutations (except NextAuth's own CSRF-protected routes)
  if (
    pathname.startsWith('/api') &&
    !pathname.startsWith('/api/auth') &&
    !checkCsrf(request)
  ) {
    return NextResponse.json({ error: 'Invalid request origin' }, { status: 403 });
  }

  const secureCookie = request.url.startsWith('https://');
  const token = await getToken({ req: request, secret: process.env.AUTH_SECRET, secureCookie });

  const isPortal = pathname.startsWith('/portal');
  const isAuthPage = pathname.startsWith('/login') || pathname.startsWith('/verify-request');
  const isProtectedApi = pathname.startsWith('/api') && !isPublicApiRoute(pathname);

  if ((isPortal || isProtectedApi) && !token) {
    if (isProtectedApi) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.redirect(new URL('/login', request.url));
  }

  if (isAuthPage && token) {
    return NextResponse.redirect(new URL('/portal', request.url));
  }

  const response = NextResponse.next();
  return addSecurityHeaders(response);
}

export const config = {
  matcher: ['/portal/:path*', '/login', '/verify-request', '/api/:path*'],
};

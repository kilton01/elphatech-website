export { auth as middleware } from '@/lib/auth';

export const config = {
  matcher: ['/portal/:path*', '/login', '/verify-request'],
};

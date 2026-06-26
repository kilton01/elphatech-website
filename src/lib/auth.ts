import NextAuth from 'next-auth';
import { DrizzleAdapter } from '@auth/drizzle-adapter';
import Email from 'next-auth/providers/email';
import { db } from './db';
import * as schema from './db/schema';
import { sendMagicLinkEmail, sendClientLoginNotificationEmail } from './bird';
import { eq } from 'drizzle-orm';

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: DrizzleAdapter(db, {
    usersTable: schema.users,
    accountsTable: schema.accounts,
    sessionsTable: schema.sessions,
    verificationTokensTable: schema.verificationTokens,
  }),
  session: { strategy: 'jwt' },
  pages: {
    signIn: '/login',
    verifyRequest: '/verify-request',
    error: '/error',
  },
  providers: [
    Email({
      server: { host: 'unused', port: 0, auth: { user: '', pass: '' } },
      from: process.env.EMAIL_FROM || 'ElphaTech <noreply@elphatechsolutions.com>',
      maxAge: 24 * 60 * 60,
      sendVerificationRequest: async ({ identifier: email, url }) => {
        await sendMagicLinkEmail(email, url);
      },
    }),
  ],
  events: {
    async signIn({ user }) {
      if (user?.email && user.role !== 'admin') {
        sendClientLoginNotificationEmail(user.email, user.name ?? null).catch(() => {});
      }
    },
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id!;
        token.role = user.role;
        token.roleRefreshedAt = Date.now();
      }
      const ROLE_REFRESH_INTERVAL = 5 * 60 * 1000;
      if (
        token.id &&
        (!token.roleRefreshedAt ||
          Date.now() - (token.roleRefreshedAt as number) > ROLE_REFRESH_INTERVAL)
      ) {
        const [dbUser] = await db
          .select({ role: schema.users.role })
          .from(schema.users)
          .where(eq(schema.users.id, token.id as string));
        if (dbUser) {
          token.role = dbUser.role;
          token.roleRefreshedAt = Date.now();
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        session.user.role = token.role as 'admin' | 'client';
      }
      return session;
    },
    authorized({ auth: session, request: { nextUrl } }) {
      const isLoggedIn = !!session?.user;
      const isPortal = nextUrl.pathname.startsWith('/portal');
      const isAuthPage = nextUrl.pathname.startsWith('/login') ||
                         nextUrl.pathname.startsWith('/verify-request');

      if (isPortal && !isLoggedIn) return false;
      if (isAuthPage && isLoggedIn) return Response.redirect(new URL('/portal', nextUrl));
      return true;
    },
  },
});

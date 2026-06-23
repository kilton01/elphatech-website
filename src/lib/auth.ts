import NextAuth from 'next-auth';
import { DrizzleAdapter } from '@auth/drizzle-adapter';
import Email from 'next-auth/providers/email';
import { db } from './db';
import * as schema from './db/schema';
import { transporter } from './email';

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
      server: {
        host: process.env.SMTP2GO_HOST!,
        port: Number(process.env.SMTP2GO_PORT) || 2525,
        auth: {
          user: process.env.SMTP2GO_USER!,
          pass: process.env.SMTP2GO_PASS!,
        },
      },
      from: process.env.EMAIL_FROM || 'ElphaTech <noreply@elphatechsolutions.com>',
      maxAge: 24 * 60 * 60,
      sendVerificationRequest: async ({ identifier: email, url }) => {
        await transporter.sendMail({
          from: process.env.EMAIL_FROM || 'ElphaTech <noreply@elphatechsolutions.com>',
          to: email,
          subject: 'Sign in to ElphaTech Portal',
          html: `
            <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
              <h2 style="color: #0A1628;">Sign in to ElphaTech</h2>
              <p style="color: #555;">Click the button below to sign in to your portal. This link expires in 24 hours.</p>
              <a href="${url}" style="display: inline-block; background: #E8302A; color: white; padding: 12px 24px; border-radius: 4px; text-decoration: none; font-weight: 600; margin: 16px 0;">
                Sign In
              </a>
              <p style="color: #999; font-size: 12px;">If you did not request this email, you can safely ignore it.</p>
            </div>
          `,
        });
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
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

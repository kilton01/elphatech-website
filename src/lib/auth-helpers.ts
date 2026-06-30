import { NextResponse } from 'next/server';
import { randomBytes, createHash } from 'crypto';
import { auth } from './auth';
import { db } from './db';
import { projectMembers, verificationTokens } from './db/schema';
import { eq, and } from 'drizzle-orm';

export async function getAuthenticatedUser() {
  const session = await auth();
  if (!session?.user) return null;
  return session.user;
}

export async function checkProjectAccess(projectId: string, userId: string, role?: 'admin' | 'client') {
  const session = await auth();
  if (!session?.user) return false;
  if (session.user.role === 'admin') return true;
  if (role === 'admin') return false;

  const member = await db
    .select({ id: projectMembers.id })
    .from(projectMembers)
    .where(
      and(
        eq(projectMembers.projectId, projectId),
        eq(projectMembers.userId, userId),
      ),
    )
    .then((rows) => rows[0]);
  return !!member;
}

export function unauthorizedResponse() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}

export function forbiddenResponse() {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}

export async function generateInviteLink(email: string, callbackUrl?: string): Promise<string> {
  const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
  const token = randomBytes(32).toString('hex');
  const hashedToken = createHash('sha256').update(`${token}${process.env.AUTH_SECRET}`).digest('hex');
  const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  await db.insert(verificationTokens).values({
    identifier: email.toLowerCase(),
    token: hashedToken,
    expires,
  });

  const params = new URLSearchParams({
    callbackUrl: callbackUrl || `${baseUrl}/portal`,
    token,
    email: email.toLowerCase(),
  });

  return `${baseUrl}/api/auth/callback/email?${params.toString()}`;
}

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { projectMembers, users } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

export async function GET(
  request: Request,
  context: { params: Promise<{ projectId: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { projectId } = await context.params;

  const isAdmin = session.user.role === 'admin';
  if (!isAdmin) {
    const member = await db
      .select({ id: projectMembers.id })
      .from(projectMembers)
      .where(
        and(
          eq(projectMembers.projectId, projectId),
          eq(projectMembers.userId, session.user.id),
        ),
      )
      .then((rows) => rows[0]);
    if (!member) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  }

  const members = await db
    .select({
      id: projectMembers.id,
      userId: projectMembers.userId,
      role: projectMembers.role,
      createdAt: projectMembers.createdAt,
      name: users.name,
      email: users.email,
    })
    .from(projectMembers)
    .leftJoin(users, eq(users.id, projectMembers.userId))
    .where(eq(projectMembers.projectId, projectId));

  return NextResponse.json(members);
}

export async function POST(
  request: Request,
  context: { params: Promise<{ projectId: string }> },
) {
  const session = await auth();
  if (!session?.user || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { projectId } = await context.params;
  const { email } = await request.json();

  if (!email || typeof email !== 'string' || !email.includes('@')) {
    return NextResponse.json({ error: 'Valid email is required' }, { status: 400 });
  }

  let user = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email.toLowerCase().trim()))
    .then((rows) => rows[0]);

  if (!user) {
    const [created] = await db
      .insert(users)
      .values({ email: email.toLowerCase().trim(), role: 'client' })
      .returning();
    user = created;
  }

  const existing = await db
    .select({ id: projectMembers.id })
    .from(projectMembers)
    .where(
      and(
        eq(projectMembers.projectId, projectId),
        eq(projectMembers.userId, user.id),
      ),
    )
    .then((rows) => rows[0]);

  if (existing) {
    return NextResponse.json(
      { error: 'User is already a member' },
      { status: 409 },
    );
  }

  const [member] = await db
    .insert(projectMembers)
    .values({
      projectId,
      userId: user.id,
      role: 'client',
    })
    .returning();

  return NextResponse.json(member, { status: 201 });
}

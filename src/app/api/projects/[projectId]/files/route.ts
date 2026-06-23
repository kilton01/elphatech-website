import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { files, projectMembers, users } from '@/lib/db/schema';
import { eq, and, desc } from 'drizzle-orm';

async function checkMembership(projectId: string, userId: string) {
  const session = await auth();
  if (!session?.user) return false;
  if (session.user.role === 'admin') return true;
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

export async function GET(
  request: Request,
  context: { params: Promise<{ projectId: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { projectId } = await context.params;
  const isMember = await checkMembership(projectId, session.user.id);
  if (!isMember) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const result = await db
    .select({
      id: files.id,
      name: files.name,
      key: files.key,
      size: files.size,
      mimeType: files.mimeType,
      createdAt: files.createdAt,
      uploadedBy: {
        id: users.id,
        name: users.name,
        email: users.email,
      },
    })
    .from(files)
    .leftJoin(users, eq(users.id, files.uploadedById))
    .where(eq(files.projectId, projectId))
    .orderBy(desc(files.createdAt));

  return NextResponse.json(result);
}

export async function POST(
  request: Request,
  context: { params: Promise<{ projectId: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { projectId } = await context.params;
  const isMember = await checkMembership(projectId, session.user.id);
  if (!isMember) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { key, name, size, mimeType } = await request.json();

  if (!key || !name || size === undefined || !mimeType) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  if (typeof size !== 'number' || size <= 0) {
    return NextResponse.json({ error: 'Invalid file size' }, { status: 400 });
  }

  const [file] = await db
    .insert(files)
    .values({
      projectId,
      uploadedById: session.user.id,
      name,
      key,
      size,
      mimeType,
    })
    .returning();

  return NextResponse.json(file, { status: 201 });
}

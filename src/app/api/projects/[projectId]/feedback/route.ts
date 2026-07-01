import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { feedback, projectMembers, files, activities } from '@/lib/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { createBulkNotifications } from '@/lib/notifications';

export async function GET(
  request: NextRequest,
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
      .where(and(eq(projectMembers.projectId, projectId), eq(projectMembers.userId, session.user.id)))
      .then((r) => r[0]);
    if (!member) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  }

  const fileId = request.nextUrl.searchParams.get('fileId');

  const conditions = [eq(feedback.projectId, projectId)];
  if (fileId) {
    conditions.push(eq(feedback.fileId, fileId));
  }

  const rows = await db
    .select()
    .from(feedback)
    .where(and(...conditions))
    .orderBy(desc(feedback.createdAt));

  return NextResponse.json({ feedback: rows });
}

const createSchema = z.object({
  comment: z.string().min(1, 'Comment is required'),
  rating: z.number().int().min(1).max(5).optional(),
  fileId: z.string().uuid().optional(),
});

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ projectId: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { projectId } = await context.params;

  const isAdmin = session.user.role === 'admin';
  if (isAdmin) {
    return NextResponse.json({ error: 'Admins cannot submit client feedback' }, { status: 403 });
  }

  const member = await db
    .select({ id: projectMembers.id, role: projectMembers.role })
    .from(projectMembers)
    .where(and(eq(projectMembers.projectId, projectId), eq(projectMembers.userId, session.user.id)))
    .then((r) => r[0]);

  if (!member) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  if (member.role !== 'client') {
    return NextResponse.json({ error: 'Only clients can submit feedback' }, { status: 403 });
  }

  const body = await request.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues.map((i) => i.message).join(', ') }, { status: 400 });
  }

  if (parsed.data.fileId) {
    const file = await db
      .select({ id: files.id })
      .from(files)
      .where(and(eq(files.id, parsed.data.fileId), eq(files.projectId, projectId)))
      .then((r) => r[0]);
    if (!file) {
      return NextResponse.json({ error: 'File not found in this project' }, { status: 400 });
    }
  }

  const [created] = await db.insert(feedback).values({
    projectId,
    fileId: parsed.data.fileId ?? null,
    authorId: session.user.id,
    authorName: session.user.name || session.user.email || 'Unknown',
    type: 'client_feedback',
    rating: parsed.data.rating ?? null,
    comment: parsed.data.comment,
  }).returning();

  const adminMembers = await db
    .select({ userId: projectMembers.userId })
    .from(projectMembers)
    .where(and(eq(projectMembers.projectId, projectId), eq(projectMembers.role, 'admin')));

  const adminIds = adminMembers.map((m) => m.userId);
  if (adminIds.length > 0) {
    const clientName = session.user.name || session.user.email || 'A client';
    await createBulkNotifications(adminIds, {
      projectId,
      type: 'comment_added',
      title: 'New client feedback',
      body: `${clientName} left feedback on the project`,
    });
  }

  await db.insert(activities).values({
    projectId,
    userId: session.user.id,
    action: 'feedback_submitted',
    metadata: { rating: parsed.data.rating, hasFile: !!parsed.data.fileId },
  });

  return NextResponse.json(created, { status: 201 });
}

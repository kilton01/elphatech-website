import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { projectMembers } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { getPresignedUploadUrl } from '@/lib/r2';
import { apiLimiter } from '@/lib/rate-limit';

const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'image/png',
  'image/jpeg',
  'image/gif',
  'application/zip',
  'text/plain',
];

const MAX_FILE_SIZE = 50 * 1024 * 1024;
const MAX_FILENAME_LENGTH = 255;

function sanitizeFilename(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/\.{2,}/g, '.')
    .slice(0, MAX_FILENAME_LENGTH);
}

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

export async function POST(
  request: Request,
  context: { params: Promise<{ projectId: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { success } = await apiLimiter.limit(session.user.id);
  if (!success) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  const { projectId } = await context.params;
  const isMember = await checkMembership(projectId, session.user.id);
  if (!isMember) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { name, type, size } = await request.json();

  if (!name || !type || size === undefined) {
    return NextResponse.json({ error: 'Missing file metadata' }, { status: 400 });
  }

  if (!ALLOWED_MIME_TYPES.includes(type)) {
    return NextResponse.json(
      { error: 'File type not allowed' },
      { status: 400 },
    );
  }

  if (typeof size !== 'number' || size > MAX_FILE_SIZE) {
    return NextResponse.json(
      { error: 'File exceeds maximum size of 50MB' },
      { status: 400 },
    );
  }

  const safeName = sanitizeFilename(name);
  const key = `${projectId}/${crypto.randomUUID()}-${safeName}`;
  const url = await getPresignedUploadUrl(key, type);

  return NextResponse.json({ url, key });
}

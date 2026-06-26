import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { notifications } from '@/lib/db/schema';
import { eq, desc, and, sql } from 'drizzle-orm';

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const [result, unreadCountResult] = await Promise.all([
    db
      .select({
        id: notifications.id,
        projectId: notifications.projectId,
        type: notifications.type,
        title: notifications.title,
        body: notifications.body,
        read: notifications.read,
        createdAt: notifications.createdAt,
      })
      .from(notifications)
      .where(eq(notifications.userId, session.user.id))
      .orderBy(desc(notifications.createdAt))
      .limit(50),

    db
      .select({ count: sql<number>`count(*)::int` })
      .from(notifications)
      .where(and(eq(notifications.userId, session.user.id), eq(notifications.read, false))),
  ]);

  const unreadCount = unreadCountResult[0]?.count ?? 0;

  return NextResponse.json({ notifications: result, unreadCount });
}

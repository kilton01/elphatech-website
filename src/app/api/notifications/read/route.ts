import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { notifications } from '@/lib/db/schema';
import { eq, and, inArray } from 'drizzle-orm';

export async function PATCH(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { ids } = body;

  if (ids && Array.isArray(ids) && ids.length > 0) {
    await db
      .update(notifications)
      .set({ read: true })
      .where(
        and(
          eq(notifications.userId, session.user.id),
          inArray(notifications.id, ids),
        ),
      );
  } else {
    await db
      .update(notifications)
      .set({ read: true })
      .where(eq(notifications.userId, session.user.id));
  }

  return NextResponse.json({ success: true });
}

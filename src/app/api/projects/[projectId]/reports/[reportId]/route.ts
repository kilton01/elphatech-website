import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { testerReports } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

const patchSchema = z.object({
  status: z.enum(['acknowledged', 'dismissed']),
});

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ projectId: string; reportId: string }> },
) {
  const session = await auth();
  if (!session?.user || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { reportId } = await context.params;
  const body = await request.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'status must be "acknowledged" or "dismissed"' }, { status: 400 });
  }

  const existing = await db
    .select({ status: testerReports.status })
    .from(testerReports)
    .where(eq(testerReports.id, reportId))
    .then((r) => r[0]);

  if (!existing) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const { status: newStatus } = parsed.data;
  const validTransitions: Record<string, string[]> = {
    open: ['acknowledged', 'dismissed'],
    acknowledged: ['dismissed'],
  };

  if (!validTransitions[existing.status]?.includes(newStatus)) {
    return NextResponse.json({ error: `Cannot transition from ${existing.status} to ${newStatus}` }, { status: 400 });
  }

  const [updated] = await db
    .update(testerReports)
    .set({ status: newStatus, updatedAt: new Date() })
    .where(eq(testerReports.id, reportId))
    .returning();

  return NextResponse.json(updated);
}

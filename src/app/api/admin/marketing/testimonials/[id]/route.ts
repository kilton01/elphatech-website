import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { testimonials } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

const patchSchema = z.object({
  quote: z.string().min(1).optional(),
  clientLabel: z.string().min(1).optional(),
  industry: z.string().optional(),
  clientSince: z.string().optional(),
  rating: z.number().int().min(1).max(5).optional(),
  position: z.number().int().optional(),
  status: z.enum(['draft', 'published']).optional(),
});

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await context.params;
  const body = await request.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues.map((i) => i.message).join(', ') }, { status: 400 });
  }

  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (parsed.data.quote !== undefined) updates.quote = parsed.data.quote;
  if (parsed.data.clientLabel !== undefined) updates.clientLabel = parsed.data.clientLabel;
  if (parsed.data.industry !== undefined) updates.industry = parsed.data.industry || null;
  if (parsed.data.clientSince !== undefined) updates.clientSince = parsed.data.clientSince || null;
  if (parsed.data.rating !== undefined) updates.rating = parsed.data.rating;
  if (parsed.data.position !== undefined) updates.position = parsed.data.position;
  if (parsed.data.status !== undefined) updates.status = parsed.data.status;

  const [updated] = await db.update(testimonials).set(updates).where(eq(testimonials.id, id)).returning();
  if (!updated) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json(updated);
}

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await context.params;
  const [deleted] = await db.delete(testimonials).where(eq(testimonials.id, id)).returning();
  if (!deleted) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}

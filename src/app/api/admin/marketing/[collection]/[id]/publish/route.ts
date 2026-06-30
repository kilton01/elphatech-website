import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { testimonials, caseStudies, technologies } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

const publishSchema = z.object({
  action: z.enum(['publish', 'unpublish']),
});

const COLLECTIONS = {
  testimonials,
  'case-studies': caseStudies,
  technologies,
} as const;

type CollectionKey = keyof typeof COLLECTIONS;

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ collection: string; id: string }> },
) {
  const session = await auth();
  if (!session?.user || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { collection, id } = await context.params;

  if (!(collection in COLLECTIONS)) {
    return NextResponse.json({ error: 'Invalid collection' }, { status: 400 });
  }

  const body = await request.json();
  const parsed = publishSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'action must be "publish" or "unpublish"' }, { status: 400 });
  }

  const table = COLLECTIONS[collection as CollectionKey];
  const newStatus = parsed.data.action === 'publish' ? 'published' : 'draft';

  const [updated] = await db
    .update(table)
    .set({ status: newStatus } as any)
    .where(eq(table.id, id))
    .returning();

  if (!updated) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json(updated);
}

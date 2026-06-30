import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { testimonials } from '@/lib/db/schema';
import { asc, eq } from 'drizzle-orm';

export async function GET() {
  const rows = await db
    .select()
    .from(testimonials)
    .where(eq(testimonials.status, 'published'))
    .orderBy(asc(testimonials.position));

  return NextResponse.json({ testimonials: rows }, {
    headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' },
  });
}

import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { technologies } from '@/lib/db/schema';
import { asc, eq } from 'drizzle-orm';

export async function GET() {
  const rows = await db
    .select()
    .from(technologies)
    .where(eq(technologies.status, 'published'))
    .orderBy(asc(technologies.position));

  return NextResponse.json({ technologies: rows }, {
    headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' },
  });
}

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { contactSubmissions } from '@/lib/db/schema';
import { eq, desc, sql } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status') as 'new' | 'read' | 'replied' | 'converted' | null;
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
  const limit = 20;
  const offset = (page - 1) * limit;

  const conditions = status ? eq(contactSubmissions.status, status) : undefined;

  const [contacts, totalResult, unreadResult] = await Promise.all([
    db
      .select({
        id: contactSubmissions.id,
        name: contactSubmissions.name,
        company: contactSubmissions.company,
        email: contactSubmissions.email,
        service: contactSubmissions.service,
        message: contactSubmissions.message,
        status: contactSubmissions.status,
        notes: contactSubmissions.notes,
        respondedAt: contactSubmissions.respondedAt,
        createdAt: contactSubmissions.createdAt,
      })
      .from(contactSubmissions)
      .where(conditions)
      .orderBy(desc(contactSubmissions.createdAt))
      .limit(limit)
      .offset(offset),

    db
      .select({ count: sql<number>`count(*)::int` })
      .from(contactSubmissions)
      .where(conditions),

    db
      .select({ count: sql<number>`count(*)::int` })
      .from(contactSubmissions)
      .where(eq(contactSubmissions.status, 'new')),
  ]);

  return NextResponse.json({
    contacts,
    total: totalResult[0]?.count ?? 0,
    unreadCount: unreadResult[0]?.count ?? 0,
  });
}

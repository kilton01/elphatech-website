import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { notifications, users } from '@/lib/db/schema';
import { eq, and, isNull, sql } from 'drizzle-orm';
import { sendEmail } from '@/lib/bird';

const BATCH_SIZE = 10;

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const pendingByUser = await db
    .select({
      userId: notifications.userId,
      email: users.email,
      name: users.name,
      count: sql<number>`count(*)`,
    })
    .from(notifications)
    .innerJoin(users, eq(users.id, notifications.userId))
    .where(and(isNull(notifications.emailedAt), eq(notifications.read, false)))
    .groupBy(notifications.userId, users.email, users.name);

  let sent = 0;

  for (let i = 0; i < pendingByUser.length; i += BATCH_SIZE) {
    const batch = pendingByUser.slice(i, i + BATCH_SIZE);
    await Promise.all(batch.map((entry) => processUserDigest(entry)));
    sent += batch.length;
  }

  return NextResponse.json({ sent, users: pendingByUser.length });
}

async function processUserDigest({ userId, email, name, count }: {
  userId: string;
  email: string;
  name: string | null;
  count: number;
}) {
  const items = await db
    .select({
      title: notifications.title,
      body: notifications.body,
      type: notifications.type,
      createdAt: notifications.createdAt,
    })
    .from(notifications)
    .where(and(eq(notifications.userId, userId), isNull(notifications.emailedAt)))
    .orderBy(notifications.createdAt)
    .limit(20);

  const itemsHtml = items
    .map((item) => `<li><strong>${escapeHtml(item.title)}</strong>${item.body ? ` — ${escapeHtml(item.body)}` : ''}</li>`)
    .join('');

  await sendEmail({
    to: email,
    subject: `Your daily update: ${count} new notification${count !== 1 ? 's' : ''}`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 0;">
        <div style="background: #0A1628; border-radius: 12px; padding: 40px; border: 1px solid #1E293B;">
          <h2 style="color: #FFFFFF; margin: 0 0 8px; font-size: 20px;">Hi ${escapeHtml(name || 'there')},</h2>
          <p style="color: #94A3B8; margin: 0 0 24px; font-size: 14px;">Here's what happened since your last update:</p>
          <ul style="color: #94A3B8; line-height: 1.8; padding-left: 16px; margin: 0 0 24px;">${itemsHtml}</ul>
          <a href="${process.env.NEXTAUTH_URL || 'https://portal.elphatechsolutions.com'}/portal"
             style="display: inline-block; background: #E8302A; color: white; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px;">
            View in Portal
          </a>
          <p style="color: #64748B; font-size: 12px; margin: 24px 0 0;">
            You're receiving this because you have unread notifications in your ElphaTech portal.
          </p>
        </div>
      </div>
    `,
    tags: [{ name: 'category', value: 'digest' }],
  });

  await db
    .update(notifications)
    .set({ emailedAt: new Date() })
    .where(and(eq(notifications.userId, userId), isNull(notifications.emailedAt)));
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

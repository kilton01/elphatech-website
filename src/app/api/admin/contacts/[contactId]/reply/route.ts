import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { contactSubmissions } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { sendEmail } from '@/lib/bird';

const replySchema = z.object({
  subject: z.string().min(1, 'Subject is required'),
  message: z.string().min(10, 'Message must be at least 10 characters'),
});

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ contactId: string }> },
) {
  const session = await auth();
  if (!session?.user || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { contactId } = await context.params;
  const body = await request.json();
  const parsed = replySchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues.map((i) => i.message).join(', ') },
      { status: 400 },
    );
  }

  const [contact] = await db
    .select()
    .from(contactSubmissions)
    .where(eq(contactSubmissions.id, contactId));

  if (!contact) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const { subject, message } = parsed.data;

  await sendEmail({
    to: contact.email,
    from: 'ElphaTech Solutions <info@elphatechsolutions.com>',
    subject,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 560px; margin: 0 auto; padding: 40px 0;">
        <div style="background: #0A1628; border-radius: 12px; padding: 40px; border: 1px solid #1E293B;">
          <div style="color: #E2E8F0; font-size: 14px; line-height: 1.7; white-space: pre-wrap;">${escapeHtml(message)}</div>
          <hr style="border: none; border-top: 1px solid #1E293B; margin: 32px 0;" />
          <div style="background: #121E32; border-left: 3px solid #334155; border-radius: 4px; padding: 16px; margin-top: 0;">
            <p style="color: #64748B; margin: 0 0 8px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em;">Your original message:</p>
            <p style="color: #94A3B8; margin: 0; font-size: 13px; line-height: 1.5; white-space: pre-wrap;">${escapeHtml(contact.message)}</p>
          </div>
        </div>
      </div>
    `,
    text: `${message}\n\n---\nYour original message:\n${contact.message}`,
    tags: [{ name: 'category', value: 'contact-reply' }],
  });

  await db
    .update(contactSubmissions)
    .set({ status: 'replied', respondedAt: new Date() })
    .where(eq(contactSubmissions.id, contactId));

  return NextResponse.json({ success: true });
}

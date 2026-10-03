import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { contactLimiter } from '@/lib/rate-limit';
import { sendEmail } from '@/lib/bird';
import { syncLeadToHubspot } from '@/lib/hubspot';

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function stripControlChars(str: string): string {
  return str.replace(/[\r\n\t]/g, ' ');
}

const bodySchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  company: z.string().max(200).optional(),
  email: z.string().email('Invalid email address'),
  service: z.string().max(200).optional(),
  message: z.string().min(1, 'Message is required').max(5000),
});

function isSameOrigin(request: NextRequest): boolean {
  const origin = request.headers.get('origin');
  const host = request.headers.get('host');
  if (!origin || !host) return false;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: 'Invalid request origin' }, { status: 403 });
  }

  try {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0] ?? 'anonymous';
    const { success } = await contactLimiter.limit(ip);
    if (!success) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 },
      );
    }

    const parsed = bodySchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues.map((i) => i.message).join(', ') },
        { status: 400 },
      );
    }
    const { name, company, email, service, message } = parsed.data;

    // HubSpot (lead + deal) and the notification email are independent; the enquiry is only
    // lost if both fail.
    const [crm, mail] = await Promise.allSettled([
      syncLeadToHubspot({ name, email, company, service, message }),
      sendEmail({
        to: 'info@elphatechsolutions.com',
        subject: `New Contact Form Submission from ${stripControlChars(name)}`,
        html: `
          <h2>New Contact Form Submission</h2>
          <p><strong>Name:</strong> ${escapeHtml(name)}</p>
          <p><strong>Company:</strong> ${escapeHtml(company || 'N/A')}</p>
          <p><strong>Email:</strong> ${escapeHtml(email)}</p>
          <p><strong>Service:</strong> ${escapeHtml(service || 'N/A')}</p>
          <p><strong>Message:</strong></p>
          <p>${escapeHtml(message)}</p>
        `,
      }),
    ]);

    if (crm.status === 'rejected') console.error('HubSpot sync failed:', crm.reason?.message ?? 'Unknown error');
    if (mail.status === 'rejected') console.error('Notification email failed:', mail.reason?.message ?? 'Unknown error');

    if (crm.status === 'rejected' && mail.status === 'rejected') {
      return NextResponse.json(
        { error: 'Failed to send message. Please try again later.' },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Contact form error:', error instanceof Error ? error.message : 'Unknown error');
    return NextResponse.json(
      { error: 'Failed to send message. Please try again later.' },
      { status: 500 },
    );
  }
}

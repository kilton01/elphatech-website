import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { contactLimiter } from '@/lib/rate-limit';
import { sendEmail } from '@/lib/bird';
import { db } from '@/lib/db';
import { contactSubmissions } from '@/lib/db/schema';

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

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0] ?? 'anonymous';
    const { success } = await contactLimiter.limit(ip);
    if (!success) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 },
      );
    }

    const body = await request.json();
    const parsed = bodySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues.map((i) => i.message).join(', ') },
        { status: 400 },
      );
    }

    const { name, company, email, service, message } = parsed.data;

    const [submission] = await db
      .insert(contactSubmissions)
      .values({ name, company: company || null, email, service: service || null, message })
      .returning({ id: contactSubmissions.id });

    await sendEmail({
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
    });

    return NextResponse.json({ success: true, id: submission.id });
  } catch (error) {
    console.error('Contact form error:', error instanceof Error ? error.message : 'Unknown error');
    return NextResponse.json(
      { error: 'Failed to send message. Please try again later.' },
      { status: 500 },
    );
  }
}

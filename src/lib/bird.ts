const BIRD_API_URL = process.env.BIRD_API_URL || 'https://eu1.platform.bird.com';
const BIRD_ACCESS_TOKEN = process.env.BIRD_ACCESS_TOKEN || '';
const EMAIL_FROM = process.env.EMAIL_FROM || 'ElphaTech <noreply@elphatechsolutions.com>';

function parseFromEmail(from: string): string {
  const match = from.match(/<(.+?)>$/);
  return match ? match[1] : from;
}

type SendEmailOptions = {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  from?: string;
  tags?: { name: string; value: string }[];
  metadata?: Record<string, string>;
  trackClicks?: boolean;
  trackOpens?: boolean;
};

type BirdEmailResponse = {
  id: string;
  status: string;
  accepted_count: number;
  delivered_count: number;
};

export async function sendEmail(opts: SendEmailOptions): Promise<BirdEmailResponse> {
  if (!BIRD_ACCESS_TOKEN) {
    throw new Error('BIRD_ACCESS_TOKEN is not configured');
  }
  const fromEmail = parseFromEmail(opts.from || EMAIL_FROM);
  const recipients = Array.isArray(opts.to) ? opts.to : [opts.to];

  const body: Record<string, unknown> = {
    from: fromEmail,
    to: recipients,
    subject: opts.subject,
  };

  if (opts.html) body.html = opts.html;
  if (opts.text) body.text = opts.text;
  if (opts.trackClicks === false) body.track_clicks = false;
  if (opts.trackOpens === false) body.track_opens = false;

  const res = await fetch(`${BIRD_API_URL}/v1/email/messages`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${BIRD_ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(`Bird email send failed: ${err.message || JSON.stringify(err)}`);
  }

  return res.json();
}

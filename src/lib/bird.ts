const BIRD_API_URL = process.env.BIRD_API_URL || 'https://eu1.platform.bird.com';
const BIRD_ACCESS_TOKEN = process.env.BIRD_ACCESS_TOKEN!;
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

export async function sendMagicLinkEmail(email: string, url: string) {
  return sendEmail({
    to: email,
    subject: 'Sign in to ElphaTech Portal',
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 0;">
        <div style="background: #0A1628; border-radius: 12px; padding: 40px; border: 1px solid #1E293B;">
          <h2 style="color: #FFFFFF; margin: 0 0 12px; font-size: 20px;">Sign in to ElphaTech</h2>
          <p style="color: #94A3B8; margin: 0 0 24px; font-size: 14px; line-height: 1.5;">
            Click the button below to sign in to your client portal. This link expires in 24 hours.
          </p>
          <a href="${url}" style="display: inline-block; background: #E8302A; color: white; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px;">
            Sign In to Portal
          </a>
          <p style="color: #64748B; font-size: 12px; margin: 24px 0 0; line-height: 1.4;">
            If you didn't request this email, you can safely ignore it.
          </p>
        </div>
      </div>
    `,
    text: `Sign in to ElphaTech Portal:\n\n${url}\n\nThis link expires in 24 hours.`,
    tags: [{ name: 'category', value: 'auth' }],
    trackClicks: false,
    trackOpens: false,
  });
}

export async function sendProjectInviteEmail(email: string, projectName: string, inviterName: string, inviteLink?: string) {
  const portalUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
  const link = inviteLink || `${portalUrl}/login`;
  return sendEmail({
    to: email,
    subject: `You've been added to ${projectName} — ElphaTech`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 0;">
        <div style="background: #0A1628; border-radius: 12px; padding: 40px; border: 1px solid #1E293B;">
          <h2 style="color: #FFFFFF; margin: 0 0 12px; font-size: 20px;">You're in!</h2>
          <p style="color: #94A3B8; margin: 0 0 24px; font-size: 14px; line-height: 1.5;">
            ${inviterName} added you to <strong style="color: #FFFFFF;">${projectName}</strong> on ElphaTech Portal.
            You can now view tasks, upload files, and leave comments.
          </p>
          <a href="${link}" style="display: inline-block; background: #E8302A; color: white; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px;">
            Open Portal
          </a>
          <p style="color: #64748B; font-size: 12px; margin: 24px 0 0; line-height: 1.4;">
            This link will sign you in automatically. It expires in 7 days.
          </p>
        </div>
      </div>
    `,
    text: `${inviterName} added you to ${projectName} on ElphaTech Portal.\n\nSign in: ${link}\n\nThis link expires in 7 days.`,
    tags: [{ name: 'category', value: 'invite' }],
    trackClicks: false,
    trackOpens: false,
    metadata: { project: projectName },
  });
}

export async function sendTaskAssignedEmail(email: string, taskTitle: string, projectName: string, assignerName: string) {
  const portalUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
  return sendEmail({
    to: email,
    subject: `Task assigned: ${taskTitle}`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 0;">
        <div style="background: #0A1628; border-radius: 12px; padding: 40px; border: 1px solid #1E293B;">
          <p style="color: #64748B; margin: 0 0 4px; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em;">${projectName}</p>
          <h2 style="color: #FFFFFF; margin: 0 0 12px; font-size: 20px;">${taskTitle}</h2>
          <p style="color: #94A3B8; margin: 0 0 24px; font-size: 14px; line-height: 1.5;">
            ${assignerName} assigned this task to you.
          </p>
          <a href="${portalUrl}/portal" style="display: inline-block; background: #E8302A; color: white; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px;">
            View Task
          </a>
        </div>
      </div>
    `,
    text: `${assignerName} assigned "${taskTitle}" to you in ${projectName}.\n\nView it at: ${portalUrl}/portal`,
    tags: [{ name: 'category', value: 'task-assigned' }],
    metadata: { project: projectName, task: taskTitle },
  });
}

export async function sendCommentNotificationEmail(
  email: string,
  commenterName: string,
  taskTitle: string,
  commentPreview: string,
  projectName: string,
) {
  const portalUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
  return sendEmail({
    to: email,
    subject: `New comment on "${taskTitle}"`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 0;">
        <div style="background: #0A1628; border-radius: 12px; padding: 40px; border: 1px solid #1E293B;">
          <p style="color: #64748B; margin: 0 0 4px; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em;">${projectName}</p>
          <h2 style="color: #FFFFFF; margin: 0 0 16px; font-size: 18px;">New comment on "${taskTitle}"</h2>
          <div style="background: #121E32; border-radius: 8px; padding: 16px; margin: 0 0 24px;">
            <p style="color: #FFFFFF; margin: 0 0 4px; font-size: 13px; font-weight: 600;">${commenterName}</p>
            <p style="color: #94A3B8; margin: 0; font-size: 14px; line-height: 1.5;">${commentPreview}</p>
          </div>
          <a href="${portalUrl}/portal" style="display: inline-block; background: #E8302A; color: white; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px;">
            Reply
          </a>
        </div>
      </div>
    `,
    text: `${commenterName} commented on "${taskTitle}" in ${projectName}:\n\n"${commentPreview}"\n\nReply at: ${portalUrl}/portal`,
    tags: [{ name: 'category', value: 'comment' }],
    metadata: { project: projectName, task: taskTitle },
  });
}

export async function sendClientLoginNotificationEmail(clientEmail: string, clientName: string | null) {
  const displayName = clientName || clientEmail;
  const now = new Date().toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' });
  return sendEmail({
    to: 'admin@elphatechsolutions.com',
    subject: `Client login: ${displayName}`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 0;">
        <div style="background: #0A1628; border-radius: 12px; padding: 40px; border: 1px solid #1E293B;">
          <p style="color: #64748B; margin: 0 0 4px; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em;">Client Login Alert</p>
          <h2 style="color: #FFFFFF; margin: 0 0 16px; font-size: 20px;">${displayName} just signed in</h2>
          <div style="background: #121E32; border-radius: 8px; padding: 16px; margin: 0 0 24px;">
            <p style="color: #94A3B8; margin: 0 0 8px; font-size: 14px;"><strong style="color: #FFFFFF;">Email:</strong> ${clientEmail}</p>
            <p style="color: #94A3B8; margin: 0; font-size: 14px;"><strong style="color: #FFFFFF;">Time:</strong> ${now}</p>
          </div>
          <a href="${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/portal" style="display: inline-block; background: #E8302A; color: white; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px;">
            Open Portal
          </a>
        </div>
      </div>
    `,
    text: `Client login: ${displayName} (${clientEmail}) signed in at ${now}.`,
    tags: [{ name: 'category', value: 'login-alert' }],
  });
}

export async function sendDigestEmail(
  email: string,
  userName: string,
  digest: { tasks: number; comments: number; files: number; projects: string[] },
) {
  const portalUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
  const items: string[] = [];
  if (digest.tasks > 0) items.push(`${digest.tasks} new task${digest.tasks > 1 ? 's' : ''}`);
  if (digest.comments > 0) items.push(`${digest.comments} new comment${digest.comments > 1 ? 's' : ''}`);
  if (digest.files > 0) items.push(`${digest.files} new file${digest.files > 1 ? 's' : ''}`);

  const projectList = digest.projects.map((p) => `<li style="color: #94A3B8; padding: 4px 0;">${p}</li>`).join('');

  return sendEmail({
    to: email,
    subject: `Your daily digest — ${items.join(', ')}`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 0;">
        <div style="background: #0A1628; border-radius: 12px; padding: 40px; border: 1px solid #1E293B;">
          <h2 style="color: #FFFFFF; margin: 0 0 8px; font-size: 20px;">Good morning${userName ? `, ${userName}` : ''}</h2>
          <p style="color: #94A3B8; margin: 0 0 24px; font-size: 14px;">Here's what happened since yesterday:</p>
          <div style="background: #121E32; border-radius: 8px; padding: 20px; margin: 0 0 24px;">
            <p style="color: #FFFFFF; margin: 0 0 8px; font-size: 24px; font-weight: 700;">${items.join(' · ')}</p>
            <p style="color: #64748B; margin: 0; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em;">Across ${digest.projects.length} project${digest.projects.length > 1 ? 's' : ''}</p>
          </div>
          <ul style="list-style: none; padding: 0; margin: 0 0 24px;">${projectList}</ul>
          <a href="${portalUrl}/portal" style="display: inline-block; background: #E8302A; color: white; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px;">
            Open Portal
          </a>
        </div>
      </div>
    `,
    text: `Good morning${userName ? `, ${userName}` : ''}!\n\n${items.join(', ')} across ${digest.projects.length} project(s): ${digest.projects.join(', ')}.\n\nView at: ${portalUrl}/portal`,
    tags: [{ name: 'category', value: 'digest' }],
  });
}

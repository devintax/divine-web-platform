import { getSupabaseAdmin } from "../lib/insforge";

const FROM = process.env.RESEND_FROM_EMAIL || 'noreply@dfgbusiness.com';
const REPLY_TO = process.env.RESEND_REPLY_TO || 'info@dfgbusiness.com';

// Lazy-load Resend to avoid import errors when not configured
async function getResend() {
  try {
    const { Resend } = await import('resend');
    if (!process.env.RESEND_API_KEY) return null;
    return new Resend(process.env.RESEND_API_KEY);
  } catch { return null; }
}

async function sendEmail(to: string, subject: string, html: string, metadata: Record<string, unknown>) {
  const resend = await getResend();
  if (resend) {
    try {
      await resend.emails.send({ from: FROM, to, replyTo: REPLY_TO, subject, html });
    } catch (e) {
      console.error('[Email] Resend failed:', e);
    }
  }
  // Always log to audit
  await getSupabaseAdmin().from('audit_logs').insert({
    action: 'email_sent', metadata: { ...metadata, to, subject, from: FROM },
  });
}

export async function sendWelcomeEmail(params: { to: string; name: string; service: string }): Promise<void> {
  await sendEmail(params.to, `Welcome to Divine Financial Group — ${params.service}`,
    `<p>Hi ${params.name},</p><p>Welcome! Your ${params.service} journey has started. Our team is here to help.</p>`,
    { type: 'welcome_email', name: params.name, service: params.service });
}

export async function sendStaffNotificationEmail(params: {
  service: string; clientName: string; clientEmail: string; pod: string;
  enrollmentId: string; intakeSummary: Record<string, unknown>;
}): Promise<void> {
  await sendEmail(REPLY_TO, `[${params.service}] New intake — ${params.clientName}`,
    `<p>New ${params.service} intake from ${params.clientName} (${params.clientEmail}).</p><p>Pod: ${params.pod}</p><p>Enrollment: ${params.enrollmentId}</p>`,
    { type: 'staff_notify', ...params });
}

export async function sendStatusUpdateEmail(params: {
  to: string; name: string; service: string; status: string; message: string;
}): Promise<void> {
  await sendEmail(params.to, `Your ${params.service} — ${params.status}`,
    `<p>Hi ${params.name},</p><p>${params.message}</p>`,
    { type: 'status_update', ...params });
}

export async function sendMissingDocumentEmail(params: {
  to: string; name: string; service: string; missingItems: string[]; uploadLink: string;
}): Promise<void> {
  const list = params.missingItems.map(i => `<li>${i}</li>`).join('');
  await sendEmail(params.to, `Documents needed for ${params.service}`,
    `<p>Hi ${params.name},</p><p>Please upload the following:</p><ul>${list}</ul><p><a href="${params.uploadLink}">Upload here</a></p>`,
    { type: 'missing_docs', ...params });
}

export async function sendComplianceAlertEmail(params: {
  to: string; businessName: string; alertType: string; dueDate: string; message: string;
}): Promise<void> {
  await sendEmail(params.to, `Compliance Alert — ${params.alertType}`,
    `<p>Hi,</p><p>${params.message}</p><p>Due date: ${params.dueDate}</p>`,
    { type: 'compliance_alert', ...params });
}

export async function sendCallbackConfirmationEmail(params: {
  to: string; name: string; callbackTime: string; service: string;
}): Promise<void> {
  await sendEmail(params.to, `Callback scheduled — ${params.service}`,
    `<p>Hi ${params.name},</p><p>Your callback for ${params.service} is scheduled for ${params.callbackTime}.</p>`,
    { type: 'callback_confirm', ...params });
}

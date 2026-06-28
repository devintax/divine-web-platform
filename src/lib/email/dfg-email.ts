import "server-only";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

type EmailResult = { sent: boolean; error?: string };

function canSendEmail() {
  return Boolean(process.env.RESEND_API_KEY && process.env.RESEND_FROM_EMAIL);
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" })[char] || char);
}

async function sendEmail(to: string | null | undefined, subject: string, html: string): Promise<EmailResult> {
  if (!to || !canSendEmail()) return { sent: false, error: "Email provider is not configured" };
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.RESEND_FROM_EMAIL,
        reply_to: process.env.RESEND_REPLY_TO || process.env.RESEND_FROM_EMAIL,
        to,
        subject,
        html,
      }),
    });
    if (!res.ok) return { sent: false, error: await res.text() };
    return { sent: true };
  } catch (error: any) {
    return { sent: false, error: error?.message || "Email send failed" };
  }
}

function shell(title: string, body: string) {
  return `
    <div style="font-family:Arial,sans-serif;max-width:620px;margin:0 auto;color:#0f172a;">
      <div style="background:#0B4DA2;color:#fff;padding:20px 24px;border-radius:10px 10px 0 0;">
        <div style="font-size:18px;font-weight:800;">Divine Financial Group</div>
        <div style="font-size:13px;opacity:.9;margin-top:4px;">${escapeHtml(title)}</div>
      </div>
      <div style="border:1px solid #e2e8f0;border-top:0;padding:24px;border-radius:0 0 10px 10px;background:#fff;">
        ${body}
        <p style="font-size:12px;color:#64748b;margin-top:28px;line-height:1.5;">
          Divine Financial Group<br>
          622 E. Basin Road, Suite A, New Castle, DE 19720<br>
          (302) 322-5515
        </p>
      </div>
    </div>`;
}

function button(label: string, href: string, color = "#0B4DA2") {
  return `<p style="margin:24px 0;"><a href="${href}" style="background:${color};color:#fff;padding:12px 18px;border-radius:8px;text-decoration:none;font-weight:700;display:inline-block;">${escapeHtml(label)}</a></p>`;
}

export const DFGEmail = {
  intakeConfirmation(to: string | null | undefined, name: string | null | undefined, service: string, referenceId: string) {
    return sendEmail(
      to,
      `We received your ${service} request`,
      shell(`${service} request received`, `
        <p>Hi ${escapeHtml(name || "there")},</p>
        <p>We received your <strong>${escapeHtml(service)}</strong> request and routed it to the right specialist desk.</p>
        <p><strong>Reference:</strong> ${escapeHtml(referenceId)}</p>
        ${button("View your order", `${APP_URL}/portal/orders`)}
      `),
    );
  },

  documentRequested(to: string | null | undefined, name: string | null | undefined, documentName: string, uploadUrl: string, expiresAt: string) {
    return sendEmail(
      to,
      `Document needed: ${documentName}`,
      shell("Secure document request", `
        <p>Hi ${escapeHtml(name || "there")},</p>
        <p>Your specialist needs <strong>${escapeHtml(documentName)}</strong>.</p>
        ${button(`Upload ${documentName}`, uploadUrl)}
        <p style="font-size:13px;color:#64748b;">This secure link expires ${escapeHtml(new Date(expiresAt).toLocaleString())}.</p>
      `),
    );
  },

  newMessage(to: string | null | undefined, name: string | null | undefined, service: string) {
    return sendEmail(
      to,
      `New message about your ${service} case`,
      shell("New specialist message", `
        <p>Hi ${escapeHtml(name || "there")},</p>
        <p>Your ${escapeHtml(service)} specialist sent you a message.</p>
        ${button("Read and reply", `${APP_URL}/portal/orders`)}
      `),
    );
  },

  readyForReview(to: string | null | undefined, name: string | null | undefined, service: string, title: string) {
    return sendEmail(
      to,
      `${title} is ready for review`,
      shell("Ready for review", `
        <p>Hi ${escapeHtml(name || "there")},</p>
        <p><strong>${escapeHtml(title)}</strong> is ready for your review and approval.</p>
        ${button("Review now", `${APP_URL}/portal/orders`, "#16A34A")}
      `),
    );
  },

  caseCompleted(to: string | null | undefined, name: string | null | undefined, service: string) {
    return sendEmail(
      to,
      `Your ${service} case is complete`,
      shell("Case complete", `
        <p>Hi ${escapeHtml(name || "there")},</p>
        <p>Your <strong>${escapeHtml(service)}</strong> case is complete. Final documents are available in your secure vault.</p>
        ${button("Open secure vault", `${APP_URL}/portal/vault`)}
      `),
    );
  },
};

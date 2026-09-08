import "server-only";
import nodemailer from "nodemailer";
import { publicAppUrl } from "@/lib/app-url";
import { allowsNotificationPreference, type NotificationPreferenceKey } from "@/lib/notification-preferences";

type EmailResult = { sent: boolean; error?: string; skipped?: boolean };
type EmailOptions = {
  preference?: NotificationPreferenceKey;
  userId?: string | null;
  bypassPreferences?: boolean;
};

function canSendEmail() {
  return Boolean(process.env.MAIL_HOST && process.env.MAIL_PORT && process.env.MAIL_USER && process.env.MAIL_PASS && process.env.MAIL_FROM);
}

function smtpTransport() {
  return nodemailer.createTransport({
    host: process.env.MAIL_HOST,
    port: Number(process.env.MAIL_PORT || 587),
    secure: String(process.env.MAIL_SECURE || "").toLowerCase() === "true" || process.env.MAIL_PORT === "465",
    auth: {
      user: process.env.MAIL_USER,
      pass: process.env.MAIL_PASS,
    },
  });
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" })[char] || char);
}

async function sendEmail(to: string | null | undefined, subject: string, html: string, options: EmailOptions = {}): Promise<EmailResult> {
  if (!to || !canSendEmail()) return { sent: false, error: "Email provider is not configured" };
  const allowed = await allowsNotificationPreference({
    email: to,
    userId: options.userId,
    key: options.preference,
    bypass: options.bypassPreferences,
  });
  if (!allowed) return { sent: false, skipped: true, error: "Email disabled by notification preferences" };
  try {
    await smtpTransport().sendMail({
      from: `"Divine Financial Group" <${process.env.MAIL_FROM}>`,
      replyTo: process.env.MAIL_REPLY_TO || process.env.MAIL_FROM,
      to,
      subject,
      html,
    });
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
  raw(to: string | null | undefined, subject: string, html: string, options?: EmailOptions) {
    return sendEmail(to, subject, html, options);
  },

  intakeConfirmation(to: string | null | undefined, name: string | null | undefined, service: string, referenceId: string, userId?: string | null) {
    return sendEmail(
      to,
      `We received your ${service} request`,
      shell(`${service} request received`, `
        <p>Hi ${escapeHtml(name || "there")},</p>
        <p>We received your <strong>${escapeHtml(service)}</strong> request and routed it to the right specialist desk.</p>
        <p><strong>Reference:</strong> ${escapeHtml(referenceId)}</p>
        ${button("View your order", publicAppUrl("/portal/orders"))}
      `),
      { preference: "email_on_update", userId },
    );
  },

  welcome(to: string | null | undefined, name: string | null | undefined) {
    return sendEmail(
      to,
      "Welcome to Divine Financial Group",
      shell("Welcome to your secure client portal", `
        <p>Hi ${escapeHtml(name || "there")},</p>
        <p>Your Divine Financial Group portal account has been created. Once your email is verified, you can submit service requests, upload documents, message your specialist, and review completed work from your secure dashboard.</p>
        ${button("Open the portal", publicAppUrl("/login"))}
      `),
      { bypassPreferences: true },
    );
  },

  emailVerification(to: string | null | undefined, name: string | null | undefined, verifyUrl: string) {
    return sendEmail(
      to,
      "Verify your Divine Financial Group account",
      shell("Verify your email address", `
        <p>Hi ${escapeHtml(name || "there")},</p>
        <p>Please verify your email address to activate your Divine Financial Group client portal account.</p>
        ${button("Verify my email", verifyUrl)}
        <p style="font-size:13px;color:#64748b;">This secure link expires in 24 hours. If you did not create this account, you can ignore this message.</p>
      `),
      { bypassPreferences: true },
    );
  },

  documentRequested(to: string | null | undefined, name: string | null | undefined, documentName: string, uploadUrl: string, expiresAt: string, userId?: string | null) {
    return sendEmail(
      to,
      `Document needed: ${documentName}`,
      shell("Secure document request", `
        <p>Hi ${escapeHtml(name || "there")},</p>
        <p>Your specialist needs <strong>${escapeHtml(documentName)}</strong>.</p>
        ${button(`Upload ${documentName}`, uploadUrl)}
        <p style="font-size:13px;color:#64748b;">This secure link expires ${escapeHtml(new Date(expiresAt).toLocaleString())}.</p>
      `),
      { preference: "email_on_update", userId },
    );
  },

  newMessage(to: string | null | undefined, name: string | null | undefined, service: string, userId?: string | null) {
    return sendEmail(
      to,
      `New message about your ${service} case`,
      shell("New specialist message", `
        <p>Hi ${escapeHtml(name || "there")},</p>
        <p>Your ${escapeHtml(service)} specialist sent you a message.</p>
        ${button("Read and reply", publicAppUrl("/portal/orders"))}
      `),
      { preference: "email_on_message", userId },
    );
  },

  readyForReview(to: string | null | undefined, name: string | null | undefined, service: string, title: string, userId?: string | null) {
    return sendEmail(
      to,
      `${title} is ready for review`,
      shell("Ready for review", `
        <p>Hi ${escapeHtml(name || "there")},</p>
        <p><strong>${escapeHtml(title)}</strong> is ready for your review and approval.</p>
        ${button("Review now", publicAppUrl("/portal/orders"), "#16A34A")}
      `),
      { preference: "email_on_update", userId },
    );
  },

  caseCompleted(to: string | null | undefined, name: string | null | undefined, service: string, userId?: string | null) {
    return sendEmail(
      to,
      `Your ${service} case is complete`,
      shell("Case complete", `
        <p>Hi ${escapeHtml(name || "there")},</p>
        <p>Your <strong>${escapeHtml(service)}</strong> case is complete. Final documents are available in your secure vault.</p>
        ${button("Open secure vault", publicAppUrl("/portal/vault"))}
      `),
      { preference: "email_on_complete", userId },
    );
  },

  twoFactorCode(to: string | null | undefined, name: string | null | undefined, code: string) {
    return sendEmail(
      to,
      "Your Divine Financial Group sign-in code",
      shell("Secure sign-in verification", `
        <p>Hi ${escapeHtml(name || "there")},</p>
        <p>Use this code to finish signing in to your secure DFG portal:</p>
        <p style="font-size:30px;letter-spacing:8px;font-weight:800;color:#0B4DA2;margin:20px 0;">${escapeHtml(code)}</p>
        <p style="font-size:13px;color:#64748b;">This code expires in 10 minutes. If you did not try to sign in, please call Divine Financial Group.</p>
      `),
      { bypassPreferences: true },
    );
  },
};

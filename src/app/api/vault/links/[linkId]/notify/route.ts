import { NextRequest, NextResponse } from "next/server";
import { verifyStaff } from "@/lib/auth-server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { logAudit } from "@/lib/audit";
import { sendSms } from "@/lib/sms";

export const runtime = "nodejs";

export async function POST(req: NextRequest, { params }: { params: Promise<{ linkId: string }> }) {
  const session = await verifyStaff();
  if (!session) return NextResponse.json({ error: "Staff only" }, { status: 403 });

  const { linkId } = await params;
  const body = await req.json().catch(() => ({}));
  const channel = String(body.channel || "both").toLowerCase();
  if (!["email", "sms", "both"].includes(channel)) return NextResponse.json({ error: "channel must be email, sms, or both" }, { status: 422 });

  const admin = getSupabaseAdmin();
  const { data: link } = await admin.from("upload_links").select("*").eq("id", linkId).single();
  if (!link) return NextResponse.json({ error: "Upload link not found" }, { status: 404 });

  const { data: client } = await admin.from("user_profiles").select("id,legal_name,email,phone").eq("id", link.client_user_id).single();
  if (!client) return NextResponse.json({ error: "Client not found" }, { status: 404 });

  const uploadUrl = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/upload/${link.token}`;
  const errors: string[] = [];
  let emailSent = false;
  let smsSent = false;

  if ((channel === "email" || channel === "both") && (link.recipient_email || client.email)) {
    emailSent = await sendUploadLinkEmail(link.recipient_email || client.email, link.purpose || "Document upload", uploadUrl, link.expires_at);
    if (emailSent) await admin.from("upload_links").update({ email_sent_at: new Date().toISOString() }).eq("id", linkId);
    else errors.push("Email failed");
  }

  if ((channel === "sms" || channel === "both") && client.phone) {
    const sms = await sendSms(
      client.phone,
      `Hi ${client.legal_name || "there"}! DFG sent you a secure document upload link. Upload here: ${uploadUrl}. Questions? Call (302) 322-5515.`,
      { relatedResourceType: "upload_link", relatedResourceId: linkId, sentBy: session.profileId },
    );
    smsSent = sms.success;
    if (sms.success) await admin.from("upload_links").update({ sms_sent_at: new Date().toISOString() }).eq("id", linkId);
    else errors.push(`SMS failed: ${sms.error || "unknown error"}`);
  }

  await logAudit({
    action: "upload_link_notified",
    userId: client.id,
    staffId: session.profileId,
    resourceType: "upload_link",
    resourceId: linkId,
    eventCategory: "vault",
    metadata: { channel, emailSent, smsSent, errors },
  });

  return NextResponse.json({ success: errors.length === 0, emailSent, smsSent, errors });
}

async function sendUploadLinkEmail(to: string, purpose: string, url: string, expiresAt?: string | null) {
  if (!process.env.RESEND_API_KEY || !process.env.RESEND_FROM_EMAIL) return false;
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.RESEND_FROM_EMAIL,
        to,
        subject: "Secure document upload link - Divine Financial Group",
        html: `<p>Please upload your document securely for Divine Financial Group.</p><p><b>Purpose:</b> ${escapeHtml(purpose)}</p><p><a href="${url}">Upload documents</a></p>${expiresAt ? `<p>This link expires ${new Date(expiresAt).toLocaleString()}.</p>` : ""}`,
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" })[char] || char);
}

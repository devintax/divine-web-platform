import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { verifyStaff } from "@/lib/auth-server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { logAudit } from "@/lib/audit";
import { sendSms } from "@/lib/sms";

export const runtime = "nodejs";

const HOURS: Record<string, number> = { "24h": 24, "48h": 48, "7 days": 168 };

export async function POST(req: NextRequest) {
  const session = await verifyStaff();
  if (!session) return NextResponse.json({ error: "Staff only" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const recipientEmail = String(body.recipientEmail || "").trim().toLowerCase();
  const targetUserId = String(body.clientUserId || body.targetUserId || "").trim();
  const enrollmentId = String(body.enrollmentId || "").trim() || null;
  const purpose = String(body.purpose || "Document upload").trim();
  const hours = typeof body.expiresInHours === "number" ? Math.min(Math.max(body.expiresInHours, 1), 168) : HOURS[String(body.expiresIn || "48h")] || 48;
  const maxUses = Math.min(Math.max(Number(body.maxUses || 5), 1), 10);
  if (!targetUserId) return NextResponse.json({ error: "clientUserId or targetUserId is required" }, { status: 422 });

  const admin = getSupabaseAdmin();
  if (enrollmentId) {
    const { data: enrollment } = await admin.from("service_enrollments").select("id,user_id").eq("id", enrollmentId).single();
    if (!enrollment || enrollment.user_id !== targetUserId) return NextResponse.json({ error: "Enrollment does not belong to the target client" }, { status: 422 });
  }

  const token = randomUUID();
  const expiresAt = new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
  const { data, error } = await admin.from("upload_links").insert({
    token,
    created_by: session.profileId,
    client_user_id: targetUserId,
    recipient_email: recipientEmail || null,
    purpose,
    expires_at: expiresAt,
    max_uses: maxUses,
    used_count: 0,
    is_active: true,
    enrollment_id: enrollmentId,
  }).select("*").single();
  if (error || !data) return NextResponse.json({ error: error?.message || "Failed to create upload link" }, { status: 500 });

  const url = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/upload/${token}`;
  let emailSent = false;
  let smsSent = false;
  if (recipientEmail) {
    emailSent = await sendUploadLinkEmail(recipientEmail, purpose, url, expiresAt);
    if (emailSent) await admin.from("upload_links").update({ email_sent_at: new Date().toISOString() }).eq("id", data.id);
  }
  const { data: client } = await admin.from("user_profiles").select("legal_name,phone").eq("id", targetUserId).single();
  if ((client as any)?.phone) {
    const sms = await sendSms(
      (client as any).phone,
      `Hi ${(client as any).legal_name || "there"}! Divine Financial Group sent you a secure upload link for ${purpose}. Upload here: ${url}. Link expires in ${hours} hours. Questions? Call (302) 322-5515.`,
      { relatedResourceType: "upload_link", relatedResourceId: data.id, sentBy: session.profileId },
    );
    smsSent = sms.success;
    if (smsSent) await admin.from("upload_links").update({ sms_sent_at: new Date().toISOString() }).eq("id", data.id);
  }

  await logAudit({
    action: "upload_link_created",
    userId: targetUserId,
    staffId: session.profileId,
    resourceType: "upload_link",
    resourceId: data.id,
    eventCategory: "vault",
    metadata: { recipient_email: recipientEmail, expires_in_hours: hours, maxUses, enrollmentId, emailSent, smsSent },
  });
  return NextResponse.json({ success: true, token, expiresAt, url, uploadUrl: url, emailSent, smsSent, linkId: data.id });
}

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!token) return NextResponse.json({ error: "Missing token" }, { status: 400 });
  const admin = getSupabaseAdmin();
  const { data, error } = await admin.from("upload_links").select("*").eq("token", token).single();
  if (error || !data) return NextResponse.json({ error: "Invalid link" }, { status: 404 });
  if (!data.is_active) return NextResponse.json({ error: "Link inactive" }, { status: 403 });
  if (data.expires_at && new Date(data.expires_at) < new Date()) {
    await admin.from("upload_links").update({ is_active: false }).eq("id", data.id);
    return NextResponse.json({ error: "Link expired" }, { status: 410 });
  }
  if ((data.used_count || 0) >= (data.max_uses || 1)) {
    await admin.from("upload_links").update({ is_active: false }).eq("id", data.id);
    return NextResponse.json({ error: "Link use limit reached" }, { status: 403 });
  }
  return NextResponse.json({
    valid: true,
    recipientEmail: data.recipient_email,
    purpose: data.purpose,
    expiresAt: data.expires_at,
    usedCount: data.used_count || 0,
    maxUses: data.max_uses || 1,
    enrollmentId: data.enrollment_id || null,
  });
}

async function sendUploadLinkEmail(to: string, purpose: string, url: string, expiresAt: string) {
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
        html: `<p>Please upload your document securely for Divine Financial Group.</p><p><b>Purpose:</b> ${escapeHtml(purpose)}</p><p><a href="${url}">Upload documents</a></p><p>This link expires ${new Date(expiresAt).toLocaleString()}.</p>`,
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

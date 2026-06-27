import { NextRequest, NextResponse } from "next/server";
import { verifyStaff } from "@/lib/auth-server";
import { can } from "@/lib/rbac/can";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { logAudit } from "@/lib/audit";
import { sendSms } from "@/lib/sms";

export async function POST(req: NextRequest) {
  const session = await verifyStaff();
  if (!session || (!can(session.role, "send_email_to_client") && !can(session.role, "send_sms_to_client"))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const userId = String(body.userId || "").trim();
  const message = String(body.message || "").trim();
  const subject = String(body.subject || "Divine Financial Group update").trim();
  const channel = String(body.channel || "").trim().toLowerCase();
  if (!userId || !message) return NextResponse.json({ error: "userId and message are required" }, { status: 400 });

  const admin = getSupabaseAdmin();
  const { data: profile } = await admin.from("user_profiles").select("id,email,phone").eq("id", userId).single();
  if (!profile) return NextResponse.json({ error: "Client not found" }, { status: 404 });

  if (channel === "sms") {
    if (!can(session.role, "send_sms_to_client")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    if (!(profile as any).phone) return NextResponse.json({ error: "Client has no phone number on file" }, { status: 422 });
    const result = await sendSms((profile as any).phone, `Divine Financial Group: ${message}`, {
      relatedResourceType: "user_profile",
      relatedResourceId: userId,
      sentBy: session.profileId,
    });
    await logAudit({ action: "client_sms_sent", staffId: session.profileId, userId, resourceType: "user_profile", resourceId: userId, eventCategory: "system", metadata: { subject, provider: result.provider, success: result.success } });
    if (!result.success) return NextResponse.json({ error: result.error || "SMS send failed" }, { status: 502 });
    return NextResponse.json({ success: true, channel: "sms", provider: result.provider });
  }

  await admin.from("callback_queue").insert({
    user_id: userId,
    preferred_method: profile.phone ? "call" : "email",
    service_context: subject,
    status: "pending",
    ai_gathered_data: { message, queued_by: session.profileId },
  });
  await logAudit({ action: "client_notification_queued", staffId: session.profileId, userId, resourceType: "user_profile", resourceId: userId, eventCategory: "system", metadata: { subject } });
  return NextResponse.json({ success: true, queued: true });
}

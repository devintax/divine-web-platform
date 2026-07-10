import { NextRequest, NextResponse } from "next/server";
import { writeAuditLog } from "@/lib/audit";
import { DFGEmail } from "@/lib/email/dfg-email";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const { staffEmail, staffName, fileName, enrollmentId, clientUserId } = await req.json().catch(() => ({}));
  if (!staffEmail) {
    return NextResponse.json({ ok: true, skipped: true });
  }

  const admin = getSupabaseAdmin();
  const { data: client } = clientUserId
    ? await admin.from("user_profiles").select("legal_name,email").eq("id", clientUserId).single()
    : { data: null };

  const result = await DFGEmail.raw(
    staffEmail,
    `New document uploaded - ${client?.legal_name || "Client"}`,
    `
      <p>Hi ${staffName || "there"},</p>
      <p><strong>${client?.legal_name || "A client"}</strong> uploaded <strong>${fileName || "a document"}</strong>.</p>
      <p><a href="${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/portal/admin">Review in Staff Dashboard</a></p>
      <p style="color:#64748b;font-size:12px;">Divine Financial Group - (302) 322-5515 - support@dfgworld.net</p>
    `,
    { bypassPreferences: true },
  );

  if (!result.sent) console.warn("[notify/staff-upload] email skipped", result.error);

  await writeAuditLog({
    userId: clientUserId,
    action: "staff_upload_notification_sent",
    resourceType: "enrollment",
    resourceId: enrollmentId,
    eventCategory: "system",
    metadata: { staffEmail, fileName, emailSent: result.sent, emailError: result.error },
  });

  return NextResponse.json({ ok: true, emailSent: result.sent });
}

import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { writeAuditLog } from "@/lib/audit";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const { staffEmail, staffName, fileName, enrollmentId, clientUserId } = await req.json().catch(() => ({}));
  if (!staffEmail || !process.env.RESEND_API_KEY || !process.env.RESEND_FROM_EMAIL) {
    return NextResponse.json({ ok: true, skipped: true });
  }

  const admin = getSupabaseAdmin();
  const { data: client } = clientUserId
    ? await admin.from("user_profiles").select("legal_name,email").eq("id", clientUserId).single()
    : { data: null };

  const resend = new Resend(process.env.RESEND_API_KEY);
  await resend.emails
    .send({
      from: `Divine Financial Group <${process.env.RESEND_FROM_EMAIL}>`,
      to: staffEmail,
      subject: `New document uploaded - ${client?.legal_name || "Client"}`,
      html: `
        <p>Hi ${staffName || "there"},</p>
        <p><strong>${client?.legal_name || "A client"}</strong> uploaded <strong>${fileName || "a document"}</strong>.</p>
        <p><a href="${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/portal/admin">Review in Staff Dashboard</a></p>
        <p style="color:#64748b;font-size:12px;">Divine Financial Group · (302) 322-5515 · info@dfgbusiness.com</p>
      `,
    })
    .catch((error) => console.warn("[notify/staff-upload] email skipped", error));

  await writeAuditLog({
    userId: clientUserId,
    action: "staff_upload_notification_sent",
    resourceType: "enrollment",
    resourceId: enrollmentId,
    eventCategory: "system",
    metadata: { staffEmail, fileName },
  });

  return NextResponse.json({ ok: true });
}

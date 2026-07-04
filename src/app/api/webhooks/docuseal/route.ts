import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { logAudit } from "@/lib/audit";

export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-docuseal-secret") || req.headers.get("x-auth-token");
  if (process.env.DOCUSEAL_WEBHOOK_SECRET && secret !== process.env.DOCUSEAL_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = await req.json().catch(() => null);
  if (!payload) return NextResponse.json({ ok: true });

  const eventType = payload.event_type || payload.event || payload.type || "";
  const data = payload.data || payload;
  const submissionId = String(data.submission_id || data.submissionId || data.id || "");
  if (!submissionId) return NextResponse.json({ ok: true });

  const admin = getSupabaseAdmin();
  const { data: rows } = await admin
    .from("case_deliverables")
    .select("id,enrollment_id,description")
    .ilike("description", `%DocuSeal submission ${submissionId}%`)
    .limit(1);
  const deliverable = (rows as any[])?.[0];
  if (!deliverable) return NextResponse.json({ ok: true });

  if (eventType.includes("completed") || data.status === "completed") {
    await admin.from("case_deliverables").update({
      client_approved: true,
      client_approved_at: data.completed_at || data.submitter?.completed_at || new Date().toISOString(),
      review_notes: `Signed via DocuSeal submission ${submissionId}`,
    }).eq("id", deliverable.id);

    await admin.from("case_messages").insert({
      enrollment_id: deliverable.enrollment_id,
      sender_type: "system",
      message: `Document signed via DocuSeal submission ${submissionId}.`,
      read_by_client: false,
      read_by_staff: false,
      metadata: { message_type: "esign_completed", docuseal_submission_id: submissionId },
    });

    await logAudit({
      action: "document_signed_via_docuseal",
      resourceType: "case_deliverable",
      resourceId: deliverable.id,
      eventCategory: "workflow",
      metadata: { submissionId, eventType },
    });
  }

  return NextResponse.json({ ok: true });
}

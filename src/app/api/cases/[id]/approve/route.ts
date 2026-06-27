import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth-server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { loadCaseBundle, canReadCase } from "@/lib/case-records";
import { signalWorkflow } from "@/lib/temporal";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getAuthSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const bundle = await loadCaseBundle(id);
  if (!bundle || !canReadCase(bundle, session) || bundle.enrollment.user_id !== session.profileId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const deliverableId = String(body.deliverableId || "");
  if (!deliverableId) return NextResponse.json({ error: "deliverableId is required" }, { status: 400 });

  const admin = getSupabaseAdmin();
  const approvedAt = new Date().toISOString();
  const { error } = await admin.from("case_deliverables").update({
    client_approved: true,
    approved_at: approvedAt,
  }).eq("id", deliverableId).eq("enrollment_id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await admin.from("service_enrollments").update({
    progress: Math.max(bundle.enrollment.progress || 0, 95),
    client_approved_at: approvedAt,
    client_message: "Approved. Your specialist will finalize the case.",
    updated_at: approvedAt,
  }).eq("id", id);
  await admin.from("case_messages").insert({
    enrollment_id: id,
    sender_id: session.profileId,
    sender_type: "client",
    message: "I approve this deliverable. Please proceed.",
    read_by_client: true,
    read_by_staff: false,
  });

  try { await signalWorkflow(`${bundle.enrollment.service_type}-${id}`, "clientApprovedSignal", { deliverableId }); } catch {}
  return NextResponse.json({ success: true });
}

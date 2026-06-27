import { NextRequest, NextResponse } from "next/server";
import { verifyStaff } from "@/lib/auth-server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { canAccessServiceDesk, isServiceType } from "@/lib/service-workflow";
import { signalWorkflow } from "@/lib/temporal";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await verifyStaff();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const admin = getSupabaseAdmin();
  const { data: enrollment } = await admin.from("service_enrollments").select("*").eq("id", id).single();
  if (!enrollment || !isServiceType(enrollment.service_type)) return NextResponse.json({ error: "Case not found" }, { status: 404 });
  if (!canAccessServiceDesk(session.role, enrollment.service_type)) return NextResponse.json({ error: "Forbidden for this service desk" }, { status: 403 });

  const { data: pendingDeliverables } = await admin
    .from("case_deliverables")
    .select("id")
    .eq("enrollment_id", id)
    .eq("requires_approval", true)
    .eq("client_approved", false)
    .limit(1);
  if (pendingDeliverables?.length) {
    return NextResponse.json({ error: "Client approval is still pending for one or more deliverables." }, { status: 409 });
  }

  const now = new Date().toISOString();
  const update = {
    status: "completed",
    progress: 100,
    completed_at: now,
    completed_by: session.profileId,
    client_message: "Your case is complete. Final documents are available in your portal.",
    updated_at: now,
  };
  const { error } = await admin.from("service_enrollments").update(update).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await admin.from("case_messages").insert({
    enrollment_id: id,
    sender_id: session.profileId,
    sender_type: "system",
    message: "Case marked complete by staff.",
    read_by_client: false,
    read_by_staff: true,
  });
  await safeSignal(`${enrollment.service_type}-${id}`, "staffCompletedSignal", update);
  return NextResponse.json({ success: true });
}

async function safeSignal(workflowId: string, signal: string, payload: unknown) {
  try { await signalWorkflow(workflowId, signal, payload); } catch {}
}

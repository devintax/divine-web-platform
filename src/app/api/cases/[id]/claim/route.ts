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

  const now = new Date().toISOString();
  const update = {
    assigned_staff_id: session.profileId,
    assigned_to: session.profileId,
    assigned_at: now,
    status: enrollment.status === "pending" ? "active" : enrollment.status,
    progress: Math.max(Number(enrollment.progress || 0), 10),
    updated_at: now,
  };
  const { error } = await admin.from("service_enrollments").update(update).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await admin.from("case_messages").insert({
    enrollment_id: id,
    sender_id: session.profileId,
    sender_type: "system",
    message: "Case claimed by specialist.",
    read_by_client: false,
    read_by_staff: true,
  });
  await safeSignal(`${enrollment.service_type}-${id}`, "caseClaimedSignal", update);
  return NextResponse.json({ success: true });
}

async function safeSignal(workflowId: string, signal: string, payload: unknown) {
  try { await signalWorkflow(workflowId, signal, payload); } catch {}
}

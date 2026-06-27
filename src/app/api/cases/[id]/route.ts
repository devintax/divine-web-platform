import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth-server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { can } from "@/lib/rbac/can";
import { loadCaseBundle, canReadCase, publicCaseBundle } from "@/lib/case-records";
import { signalWorkflow } from "@/lib/temporal";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getAuthSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const bundle = await loadCaseBundle(id);
  if (!bundle) return NextResponse.json({ error: "Case not found" }, { status: 404 });
  if (!canReadCase(bundle, session)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const admin = getSupabaseAdmin();
  if (session.role === "client") {
    await admin.from("case_messages").update({ read_by_client: true }).eq("enrollment_id", id).eq("sender_type", "staff").eq("is_internal", false);
  } else {
    await admin.from("case_messages").update({ read_by_staff: true }).eq("enrollment_id", id).eq("sender_type", "client");
  }

  const includeInternal = session.role !== "client";
  return NextResponse.json({ case: publicCaseBundle(bundle, includeInternal) });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getAuthSession();
  if (!session || !can(session.role, "assign_case")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const bundle = await loadCaseBundle(id);
  if (!bundle) return NextResponse.json({ error: "Case not found" }, { status: 404 });

  const body = await req.json();
  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  for (const key of ["status", "progress", "priority", "internal_notes", "client_message"] as const) {
    if (body[key] !== undefined) update[key] = body[key];
  }
  if (body.assignToMe) {
    update.assigned_staff_id = session.profileId;
    update.assigned_to = session.profileId;
    update.assigned_at = new Date().toISOString();
  }
  if (body.status === "completed") {
    update.completed_at = new Date().toISOString();
    update.completed_by = session.profileId;
    update.progress = 100;
  }

  const { error } = await getSupabaseAdmin().from("service_enrollments").update(update).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await safeSignal(`${bundle.enrollment.service_type}-${id}`, "caseUpdatedSignal", update);
  return NextResponse.json({ success: true });
}

async function safeSignal(workflowId: string, signal: string, payload: unknown) {
  try {
    await signalWorkflow(workflowId, signal, payload);
  } catch {
    // Workflow may not exist yet in local/dev; database state remains source of truth.
  }
}

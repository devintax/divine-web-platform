import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth-server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { can } from "@/lib/rbac/can";
import { loadCaseBundle } from "@/lib/case-records";
import { signalWorkflow } from "@/lib/temporal";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getAuthSession();
  if (!session || !can(session.role, "assign_case")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const bundle = await loadCaseBundle(id);
  if (!bundle) return NextResponse.json({ error: "Case not found" }, { status: 404 });

  const body = await req.json();
  const itemId = String(body.itemId || "");
  const isComplete = !!body.isComplete;
  if (!itemId) return NextResponse.json({ error: "itemId is required" }, { status: 400 });

  const { error } = await getSupabaseAdmin().from("case_checklist_items").update({
    is_complete: isComplete,
    completed_by: isComplete ? session.profileId : null,
    completed_at: isComplete ? new Date().toISOString() : null,
  }).eq("id", itemId).eq("enrollment_id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { data: items } = await getSupabaseAdmin().from("case_checklist_items").select("is_complete").eq("enrollment_id", id);
  const total = items?.length || 1;
  const complete = (items || []).filter((i: any) => i.is_complete).length;
  const progress = Math.max(10, Math.min(95, Math.round((complete / total) * 90)));
  await getSupabaseAdmin().from("service_enrollments").update({
    status: complete > 0 ? "active" : bundle.enrollment.status,
    progress,
    updated_at: new Date().toISOString(),
  }).eq("id", id);

  try { await signalWorkflow(`${bundle.enrollment.service_type}-${id}`, "checklistUpdatedSignal", { itemId, isComplete }); } catch {}
  return NextResponse.json({ success: true, progress });
}

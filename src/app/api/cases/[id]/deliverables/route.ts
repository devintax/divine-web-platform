import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth-server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { can } from "@/lib/rbac/can";
import { loadCaseBundle } from "@/lib/case-records";
import { isServiceType } from "@/lib/service-workflow";
import { signalWorkflow } from "@/lib/temporal";
import { defaultDeliverableType, uploadToClientVault } from "@/lib/client-vault";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getAuthSession();
  if (!session || !can(session.role, "vault_upload_to_any_client")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const bundle = await loadCaseBundle(id);
  if (!bundle || !isServiceType(bundle.enrollment.service_type)) return NextResponse.json({ error: "Case not found" }, { status: 404 });

  const form = await req.formData();
  const file = form.get("file") as File | null;
  const title = String(form.get("title") || "").trim();
  const description = String(form.get("description") || "").trim();
  const deliverableType = String(form.get("deliverableType") || defaultDeliverableType(bundle.enrollment.service_type));
  const requiresApproval = String(form.get("requiresApproval") || "false") === "true";
  if (!file || !title) return NextResponse.json({ error: "file and title are required" }, { status: 400 });

  const admin = getSupabaseAdmin();
  let documentId: string;
  try {
    const vaultResult = await uploadToClientVault({
      userId: bundle.enrollment.user_id,
      enrollmentId: id,
      serviceType: bundle.enrollment.service_type,
      file,
      pod: bundle.enrollment.pod,
    });
    documentId = vaultResult.documentId;
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Vault upload failed" }, { status: 500 });
  }

  const { data: deliverable, error } = await admin.from("case_deliverables").insert({
    enrollment_id: id,
    created_by: session.profileId,
    title,
    description,
    document_id: documentId,
    deliverable_type: deliverableType,
    requires_approval: requiresApproval,
    client_approved: !requiresApproval,
  }).select("*").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await admin.from("service_enrollments").update({
    status: requiresApproval ? "active" : "completed",
    progress: requiresApproval ? 85 : 100,
    client_message: requiresApproval ? `${title} is ready for your review.` : `${title} has been delivered to your vault.`,
    completed_at: requiresApproval ? null : new Date().toISOString(),
    completed_by: requiresApproval ? null : session.profileId,
    updated_at: new Date().toISOString(),
  }).eq("id", id);
  await admin.from("case_messages").insert({
    enrollment_id: id,
    sender_id: session.profileId,
    sender_type: "staff",
    message: requiresApproval ? `${title} is ready for your review and approval.` : `${title} has been delivered to your vault.`,
    read_by_client: false,
    read_by_staff: true,
  });

  try { await signalWorkflow(`${bundle.enrollment.service_type}-${id}`, "deliverableReadySignal", { deliverableId: deliverable.id, requiresApproval }); } catch {}
  return NextResponse.json({ success: true, deliverable });
}

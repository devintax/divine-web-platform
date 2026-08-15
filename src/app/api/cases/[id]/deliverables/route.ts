import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth-server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { can } from "@/lib/rbac/can";
import { loadCaseBundle } from "@/lib/case-records";
import { DFGEmail } from "@/lib/email/dfg-email";
import { isServiceType } from "@/lib/service-workflow";
import { SERVICE_WORKFLOW } from "@/lib/service-workflow";
import { signalWorkflow } from "@/lib/temporal";
import { defaultDeliverableType, uploadToClientVault } from "@/lib/client-vault";
import { createNotification } from "@/lib/notifications";
import { sendSms } from "@/lib/sms";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getAuthSession();
  if (!session || !can(session.role, "vault_upload_to_any_client")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const bundle = await loadCaseBundle(id);
  const serviceType = bundle?.enrollment.service_type;
  if (!bundle || !isServiceType(serviceType)) return NextResponse.json({ error: "Case not found" }, { status: 404 });

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
      serviceType,
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

  try { await signalWorkflow(`${serviceType}-${id}`, "deliverableReadySignal", { deliverableId: deliverable.id, requiresApproval }); } catch {}
  if (requiresApproval) {
    await DFGEmail.readyForReview(
      bundle.client?.email,
      bundle.client?.legal_name,
      SERVICE_WORKFLOW[serviceType].label,
      title,
      bundle.enrollment.user_id,
    );
    await createNotification({
      userId: bundle.enrollment.user_id,
      title: "Ready for review",
      body: `${title} is ready for your review and approval.`,
      type: "review",
      href: "/portal/orders",
      relatedResourceType: "deliverable",
      relatedResourceId: deliverable.id,
    });
    if (bundle.client?.phone) {
      await sendSms(
        bundle.client.phone,
        `Divine Financial Group: ${title} is ready for your review and approval. Sign in to your portal to review it.`,
        { relatedResourceType: "deliverable", relatedResourceId: deliverable.id, sentBy: session.profileId, preference: "sms_on_update", preferenceUserId: bundle.enrollment.user_id },
      );
    }
  } else {
    await DFGEmail.caseCompleted(bundle.client?.email, bundle.client?.legal_name, SERVICE_WORKFLOW[serviceType].label, bundle.enrollment.user_id);
    await createNotification({
      userId: bundle.enrollment.user_id,
      title: "Deliverable complete",
      body: `${title} has been delivered to your vault.`,
      type: "complete",
      href: "/portal/vault",
      relatedResourceType: "deliverable",
      relatedResourceId: deliverable.id,
    });
    if (bundle.client?.phone) {
      await sendSms(
        bundle.client.phone,
        `Divine Financial Group: ${title} has been delivered to your secure vault.`,
        { relatedResourceType: "deliverable", relatedResourceId: deliverable.id, sentBy: session.profileId, preference: "sms_on_update", preferenceUserId: bundle.enrollment.user_id },
      );
    }
  }
  return NextResponse.json({ success: true, deliverable });
}

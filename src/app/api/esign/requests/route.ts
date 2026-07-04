import { NextRequest, NextResponse } from "next/server";
import { verifyStaff } from "@/lib/auth-server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { logAudit } from "@/lib/audit";
import { createDocusealSubmission, getDocusealSigningUrl } from "@/lib/docuseal";

export async function POST(req: NextRequest) {
  const session = await verifyStaff();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const enrollmentId = String(body.enrollmentId || "");
  const title = String(body.title || "Document signature request").trim();
  const signerEmail = String(body.signerEmail || "").trim();
  const documentUrl = String(body.documentUrl || "").trim();
  const templateId = body.templateId ? String(body.templateId) : "";

  if (!enrollmentId || !signerEmail || (!documentUrl && !templateId)) {
    return NextResponse.json({ error: "enrollmentId, signerEmail, and either documentUrl or templateId are required" }, { status: 422 });
  }

  const admin = getSupabaseAdmin();
  const { data: enrollment } = await admin
    .from("service_enrollments")
    .select("id,user_id,service_type")
    .eq("id", enrollmentId)
    .single();
  if (!enrollment) return NextResponse.json({ error: "Enrollment not found" }, { status: 404 });

  let submission: any;
  try {
    submission = await createDocusealSubmission({
      templateId: templateId || undefined,
      title,
      documentUrl: documentUrl || undefined,
      sendEmail: true,
      submitters: [{ email: signerEmail, role: "Client", name: signerEmail }],
      metadata: { enrollmentId, serviceType: (enrollment as any).service_type },
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "DocuSeal request failed" }, { status: 502 });
  }

  const submissionId = submission.id || submission.submission?.id || submission.data?.id || null;
  const signingUrl = getDocusealSigningUrl(submission, signerEmail);

  await admin.from("case_deliverables").insert({
    enrollment_id: enrollmentId,
    created_by: session.profileId,
    title: `${title} - Signature Required`,
    description: `DocuSeal submission ${submissionId}${signingUrl ? ` | ${signingUrl}` : ""}`,
    deliverable_type: "signature",
    requires_approval: true,
    client_approved: false,
  });

  await admin.from("case_messages").insert({
    enrollment_id: enrollmentId,
    sender_id: session.profileId,
    sender_type: "staff",
    message: `Signature request sent: ${title}`,
    read_by_client: false,
    read_by_staff: true,
    metadata: { message_type: "esign_request", docuseal_submission_id: submissionId, signing_url: signingUrl },
  });

  await logAudit({
    staffId: session.profileId,
    userId: (enrollment as any).user_id,
    action: "docuseal_signature_requested",
    resourceType: "service_enrollment",
    resourceId: enrollmentId,
    eventCategory: "workflow",
    metadata: { title, signerEmail, docusealResponseId: submissionId, signingUrl },
  });

  return NextResponse.json({ success: true, submission, submissionId, signingUrl });
}

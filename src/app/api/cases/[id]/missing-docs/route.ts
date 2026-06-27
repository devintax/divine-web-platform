import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { getAuthSession } from "@/lib/auth-server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { can } from "@/lib/rbac/can";
import { loadCaseBundle } from "@/lib/case-records";
import { sendSms } from "@/lib/sms";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getAuthSession();
  if (!session || !can(session.role, "assign_case")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const bundle = await loadCaseBundle(id);
  if (!bundle) return NextResponse.json({ error: "Case not found" }, { status: 404 });

  const body = await req.json();
  const documentName = String(body.documentName || "").trim();
  const instructions = String(body.instructions || "").trim();
  if (!documentName) return NextResponse.json({ error: "documentName is required" }, { status: 400 });

  const admin = getSupabaseAdmin();
  const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
  const { data: pendingDocs } = await admin
    .from("missing_documents")
    .select("id,upload_link_id,document_name")
    .eq("enrollment_id", id)
    .eq("is_received", false);
  const existing = ((pendingDocs as any[]) || []).find((row) => normalizeName(row.document_name) === normalizeName(documentName));

  const { data: uploadLink, error: linkError } = await admin.from("upload_links").insert({
    token: randomUUID(),
    created_by: session.profileId,
    client_user_id: bundle.enrollment.user_id,
    recipient_email: bundle.client?.email || "",
    purpose: `${bundle.enrollment.service_type}: ${documentName}`,
    expires_at: expiresAt,
    max_uses: 1,
    used_count: 0,
    is_active: true,
    enrollment_id: id,
  }).select("*").single();
  if (linkError) return NextResponse.json({ error: linkError.message }, { status: 500 });

  let data;
  let error;
  if (existing) {
    if (existing.upload_link_id && existing.upload_link_id !== uploadLink.id) {
      await admin.from("upload_links").update({ is_active: false }).eq("id", existing.upload_link_id);
    }
    const updated = await admin.from("missing_documents").update({
      requested_by: session.profileId,
      instructions,
      upload_link_id: uploadLink.id,
      created_at: new Date().toISOString(),
    }).eq("id", existing.id).select("*").single();
    data = updated.data;
    error = updated.error;
  } else {
    const inserted = await admin.from("missing_documents").insert({
      enrollment_id: id,
      requested_by: session.profileId,
      document_name: documentName,
      instructions,
      upload_link_id: uploadLink.id,
    }).select("*").single();
    data = inserted.data;
    error = inserted.error;
  }
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const uploadUrl = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/upload/${uploadLink.token}`;
  await admin.from("case_messages").insert({
    enrollment_id: id,
    sender_id: session.profileId,
    sender_type: "staff",
    message: `Please upload: ${documentName}${instructions ? `\n\n${instructions}` : ""}`,
    metadata: {
      message_type: "document_request",
      upload_token: uploadLink.token,
      upload_url: uploadUrl,
      document_name: documentName,
      missing_document_id: data?.id,
      expires_at: uploadLink.expires_at,
    },
    read_by_client: false,
    read_by_staff: true,
  });
  await admin.from("service_enrollments").update({
    client_message: `Documents requested: ${documentName}`,
    updated_at: new Date().toISOString(),
  }).eq("id", id);

  if (bundle.client?.phone) {
    const sms = await sendSms(
      bundle.client.phone,
      `Hi ${bundle.client.legal_name || "there"}! Divine Financial Group needs ${documentName}. Upload securely: ${uploadUrl}. Link expires in 48 hours. Questions? Call (302) 322-5515.`,
      { relatedResourceType: "upload_link", relatedResourceId: uploadLink.id, sentBy: session.profileId },
    );
    if (sms.success) {
      await admin.from("upload_links").update({ sms_sent_at: new Date().toISOString() }).eq("id", uploadLink.id);
    }
  }

  return NextResponse.json({
    success: true,
    missingDocument: data,
    uploadUrl,
  });
}

function normalizeName(value: string) {
  return String(value || "").trim().replace(/\s+/g, " ").toLowerCase();
}

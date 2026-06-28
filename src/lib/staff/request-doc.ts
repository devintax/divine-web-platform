import { randomUUID } from "crypto";
import { DFGEmail } from "@/lib/email/dfg-email";
import { sendSms } from "@/lib/sms";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function requestMissingDocument(input: {
  enrollmentId: string;
  clientUserId: string;
  requestedBy: string;
  recipientEmail?: string | null;
  documentName: string;
  instructions?: string;
}) {
  const admin = getSupabaseAdmin();
  const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
  const { data: pendingDocs } = await admin
    .from("missing_documents")
    .select("id,upload_link_id,document_name")
    .eq("enrollment_id", input.enrollmentId)
    .eq("is_received", false);
  const existing = ((pendingDocs as any[]) || []).find((row) => normalizeName(row.document_name) === normalizeName(input.documentName));

  const { data: link, error: linkError } = await admin.from("upload_links").insert({
    token: randomUUID(),
    created_by: input.requestedBy,
    client_user_id: input.clientUserId,
    recipient_email: input.recipientEmail || null,
    purpose: input.documentName,
    expires_at: expiresAt,
    max_uses: 1,
    used_count: 0,
    is_active: true,
    enrollment_id: input.enrollmentId,
  }).select("*").single();
  if (linkError || !link) throw new Error(linkError?.message || "Upload link creation failed");

  let data;
  let error;
  if (existing) {
    if (existing.upload_link_id && existing.upload_link_id !== link.id) {
      await admin.from("upload_links").update({ is_active: false }).eq("id", existing.upload_link_id);
    }
    const updated = await admin.from("missing_documents").update({
      requested_by: input.requestedBy,
      instructions: input.instructions || null,
      upload_link_id: link.id,
      created_at: new Date().toISOString(),
    }).eq("id", existing.id).select("*").single();
    data = updated.data;
    error = updated.error;
  } else {
    const inserted = await admin.from("missing_documents").insert({
      enrollment_id: input.enrollmentId,
      requested_by: input.requestedBy,
      document_name: input.documentName,
      instructions: input.instructions || null,
      upload_link_id: link.id,
    }).select("*").single();
    data = inserted.data;
    error = inserted.error;
  }
  if (error) throw new Error(error.message);

  await admin.from("case_messages").insert({
    enrollment_id: input.enrollmentId,
    sender_id: input.requestedBy,
    sender_type: "staff",
    message: `Please upload: ${input.documentName}${input.instructions ? `\n\n${input.instructions}` : ""}`,
    metadata: {
      message_type: "document_request",
      upload_token: link.token,
      upload_url: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/upload/${link.token}`,
      document_name: input.documentName,
      missing_document_id: data?.id,
      expires_at: link.expires_at,
    },
    read_by_client: false,
    read_by_staff: true,
  });

  const { data: client } = await admin
    .from("user_profiles")
    .select("legal_name,email,phone")
    .eq("id", input.clientUserId)
    .single();
  const uploadUrl = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/upload/${link.token}`;
  await DFGEmail.documentRequested((client as any)?.email || input.recipientEmail, (client as any)?.legal_name, input.documentName, uploadUrl, link.expires_at);
  if ((client as any)?.phone) {
    const sms = await sendSms(
      (client as any).phone,
      `Hi ${(client as any).legal_name || "there"}! Divine Financial Group needs ${input.documentName}. Upload securely: ${uploadUrl}. Link expires in 48 hours.`,
      { relatedResourceType: "upload_link", relatedResourceId: link.id, sentBy: input.requestedBy },
    );
    if (sms.success) await admin.from("upload_links").update({ sms_sent_at: new Date().toISOString() }).eq("id", link.id);
  }

  return { missingDocument: data, uploadLink: link };
}

function normalizeName(value: string) {
  return String(value || "").trim().replace(/\s+/g, " ").toLowerCase();
}

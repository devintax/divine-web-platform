import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { getAuthSession } from "@/lib/auth-server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { logAudit } from "@/lib/audit";
import { sendSms } from "@/lib/sms";

export const runtime = "nodejs";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getAuthSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const admin = getSupabaseAdmin();
  const { data: missingDoc, error } = await admin
    .from("missing_documents")
    .select("id,document_name,instructions,upload_link_id,enrollment_id")
    .eq("id", id)
    .eq("is_received", false)
    .single();
  if (error || !missingDoc) return NextResponse.json({ error: "Document request not found" }, { status: 404 });

  const { data: enrollment } = await admin
    .from("service_enrollments")
    .select("id,user_id")
    .eq("id", missingDoc.enrollment_id)
    .single();
  if (!enrollment || enrollment.user_id !== session.profileId) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  if (missingDoc.upload_link_id) {
    await admin.from("upload_links").update({ is_active: false }).eq("id", missingDoc.upload_link_id);
  }

  const token = randomUUID();
  const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
  const { data: newLink, error: linkError } = await admin.from("upload_links").insert({
    token,
    created_by: session.profileId,
    client_user_id: session.profileId,
    recipient_email: session.email || null,
    purpose: `Please upload: ${missingDoc.document_name}`,
    expires_at: expiresAt,
    is_active: true,
    max_uses: 1,
    used_count: 0,
    enrollment_id: missingDoc.enrollment_id,
  }).select("id,token,expires_at").single();
  if (linkError || !newLink) {
    return NextResponse.json({ error: linkError?.message || "Failed to create upload link" }, { status: 500 });
  }

  await admin.from("missing_documents").update({
    upload_link_id: newLink.id,
    created_at: new Date().toISOString(),
  }).eq("id", missingDoc.id);

  await admin.from("case_messages").insert({
    enrollment_id: missingDoc.enrollment_id,
    sender_id: session.profileId,
    sender_type: "system",
    message: `A fresh upload link was generated for: ${missingDoc.document_name}`,
    metadata: {
      message_type: "document_request",
      upload_token: newLink.token,
      upload_url: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/upload/${newLink.token}`,
      document_name: missingDoc.document_name,
      missing_document_id: missingDoc.id,
      expires_at: newLink.expires_at,
    },
    read_by_client: true,
    read_by_staff: false,
  });

  await logAudit({
    action: "upload_link_regenerated_by_client",
    userId: session.profileId,
    resourceType: "upload_link",
    resourceId: newLink.id,
    eventCategory: "vault",
    metadata: { documentName: missingDoc.document_name, missingDocumentId: missingDoc.id },
  });

  if (session.phone) {
    const uploadUrl = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/upload/${newLink.token}`;
    const sms = await sendSms(
      session.phone,
      `Divine Financial Group refreshed your secure upload link for ${missingDoc.document_name}: ${uploadUrl}. Link expires in 48 hours.`,
      { relatedResourceType: "upload_link", relatedResourceId: newLink.id },
    );
    if (sms.success) await admin.from("upload_links").update({ sms_sent_at: new Date().toISOString() }).eq("id", newLink.id);
  }

  return NextResponse.json({
    success: true,
    token: newLink.token,
    expiresAt: newLink.expires_at,
    uploadUrl: `/upload/${newLink.token}`,
  });
}

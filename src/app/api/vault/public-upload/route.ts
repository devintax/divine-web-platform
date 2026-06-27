import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { startWorkflow, TASK_QUEUES } from "@/lib/temporal";
import { assertAllowedVaultFile, hashes, normalizeVaultCategory, piiFlags, vaultObjectName } from "@/lib/vault/security";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const token = req.nextUrl.searchParams.get("token");
    if (!token) return NextResponse.json({ error: "Missing token" }, { status: 400 });

    const admin = getSupabaseAdmin();
    const { data: link, error: linkErr } = await admin.from("upload_links").select("*").eq("token", token).eq("is_active", true).single();
    if (linkErr || !link) return NextResponse.json({ error: "Invalid or expired link" }, { status: 404 });
    if (link.expires_at && new Date(link.expires_at) < new Date()) {
      await admin.from("upload_links").update({ is_active: false }).eq("id", link.id);
      return NextResponse.json({ error: "Link expired" }, { status: 410 });
    }
    if ((link.used_count || 0) >= (link.max_uses || 1)) {
      await admin.from("upload_links").update({ is_active: false }).eq("id", link.id);
      return NextResponse.json({ error: "Link use limit reached" }, { status: 403 });
    }
    if (!link.client_user_id) {
      return NextResponse.json({ error: "Upload link is not assigned to a client" }, { status: 422 });
    }
    const { data: missingDoc } = await admin.from("missing_documents").select("id,enrollment_id").eq("upload_link_id", link.id).single();
    const enrollmentId = missingDoc?.enrollment_id || link.enrollment_id || null;
    let enrollmentService = normalizeVaultCategory("general");
    if (enrollmentId) {
      const { data: enrollment } = await admin.from("service_enrollments").select("service_type").eq("id", enrollmentId).single();
      enrollmentService = normalizeVaultCategory(enrollment?.service_type);
    }

    // Parse FormData
    const form = await req.formData();
    const files = form.getAll("files") as File[];
    if (!files.length) return NextResponse.json({ error: "No files provided" }, { status: 400 });

    const uploaded: any[] = [];
    for (const file of files) {
      const buffer = Buffer.from(await file.arrayBuffer());
      assertAllowedVaultFile(file, buffer);
      const path = vaultObjectName(link.client_user_id, enrollmentService, file.name);
      const digest = hashes(buffer);
      const flags = piiFlags(buffer, file.type || "application/octet-stream");
      const { data, error } = await admin.storage.from("dfg-quarantine").upload(path, buffer, { contentType: file.type || "application/octet-stream", upsert: false });
      if (error) throw new Error(error.message);
      uploaded.push({ name: file.name, size: file.size, type: file.type, path: (data as any)?.path || path, digest, flags });
    }

    const createdDocs: any[] = [];
    for (const u of uploaded) {
      const { data: doc } = await admin.from("vault_documents").insert({
        user_id: link.client_user_id,
        enrollment_id: enrollmentId,
        category: enrollmentService,
        file_name: u.path,
        display_name: u.name,
        file_size: u.size,
        mime_type: u.type || "application/octet-stream",
        storage_path: u.path,
        storage_key: u.path,
        storage_bucket: "dfg-quarantine",
        status: "quarantine",
        uploaded_via: "share_link",
        virus_scanned: false,
        ...u.digest,
        pii_flags: u.flags,
        scan_notes: u.flags.length ? `Potential PII detected: ${u.flags.join(", ")}` : "Awaiting malware scan",
      }).select("id").single();
      if (doc) {
        createdDocs.push(doc);
        try {
          await startWorkflow("documentVaultPipelineWorkflow", TASK_QUEUES.VAULT, `vault-${doc.id}`, [
            { documentId: doc.id, userId: link.client_user_id, category: enrollmentService, displayName: u.name },
          ]);
        } catch {
          // Staff document tab can retrigger the scan workflow if Temporal is temporarily unavailable.
        }
      }
    }

    const firstDocumentId = createdDocs[0]?.id || null;
    if (firstDocumentId) {
      await admin.from("missing_documents").update({
        is_received: true,
        received_at: new Date().toISOString(),
        document_id: firstDocumentId,
      }).eq("upload_link_id", link.id);
      if (enrollmentId) {
        await admin.from("case_messages").insert({
          enrollment_id: enrollmentId,
          sender_id: link.client_user_id,
          sender_type: "client",
          message: `Uploaded requested document${uploaded.length > 1 ? "s" : ""}: ${uploaded.map((u) => u.name).join(", ")}`,
          read_by_client: true,
          read_by_staff: false,
        });
        await admin.from("service_enrollments").update({
          client_message: "Requested document received.",
          updated_at: new Date().toISOString(),
        }).eq("id", enrollmentId);
      }
    }
    await admin.from("upload_links").update({
      used_count: (link.used_count || 0) + uploaded.length,
      used_at: new Date().toISOString(),
      is_active: (link.used_count || 0) + uploaded.length < (link.max_uses || 1),
    }).eq("id", link.id);

    return NextResponse.json({ success: true, uploaded, documentIds: createdDocs.map((doc) => doc.id) });
  } catch (e: any) {
    console.error("[vault/public-upload]", e);
    const message = e.message || "Upload failed";
    const status = /file|type|size|empty/i.test(message) ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

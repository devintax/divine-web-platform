import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth-server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { logAudit } from "@/lib/audit";
import { checkRateLimit, clientIp, rateLimitResponse } from "@/lib/rate-limit";
import { startWorkflow, TASK_QUEUES } from "@/lib/temporal";
import { assertAllowedVaultFile, hashes, normalizeVaultCategory, piiFlags, vaultObjectName } from "@/lib/vault/security";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const limit = checkRateLimit({ key: `vault-upload:${clientIp(req)}`, limit: 20, windowMs: 60 * 60 * 1000 });
    if (!limit.allowed) return rateLimitResponse(limit.resetAt);

    const session = await getAuthSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    let category = normalizeVaultCategory(formData.get("category"));
    const aiClassification = parseAIClassification(formData.get("aiClassification"));
    const enrollmentIdRaw = String(formData.get("enrollmentId") || "").trim();
    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });
    const buffer = Buffer.from(await file.arrayBuffer());
    assertAllowedVaultFile(file, buffer);
    const digest = hashes(buffer);
    const flags = piiFlags(buffer, file.type || "application/octet-stream");

    const admin = getSupabaseAdmin();
    let enrollmentId: string | null = null;
    if (enrollmentIdRaw) {
      const { data: enrollment } = await admin.from("service_enrollments").select("id,user_id,service_type").eq("id", enrollmentIdRaw).single();
      if (!enrollment || enrollment.user_id !== session.profileId) return NextResponse.json({ error: "Invalid enrollment" }, { status: 403 });
      enrollmentId = enrollment.id;
      category = enrollment.service_type;
    }
    const storageName = vaultObjectName(session.profileId, category, file.name);

    const { data: upData, error: upErr } = await admin.storage.from("dfg-quarantine").upload(storageName, buffer, { contentType: file.type });
    if (upErr) return NextResponse.json({ error: "Upload failed" }, { status: 500 });

    const { data: doc, error: dbErr } = await admin.from("vault_documents").insert({
      enrollment_id: enrollmentId,
      user_id: session.profileId, file_name: storageName, display_name: file.name, file_size: file.size, mime_type: file.type,
      storage_path: upData?.key || storageName, storage_key: upData?.key || storageName, storage_url: upData?.url || "",
      storage_bucket: "dfg-quarantine",
      category, status: "quarantine", uploaded_via: "direct", virus_scanned: false,
      ...digest,
      pii_flags: flags,
      scan_notes: [
        aiClassification ? `AI classification: ${aiClassification.label} (${Math.round(Number(aiClassification.confidence || 0) * 100)}%)` : "",
        flags.length ? `Potential PII detected: ${flags.join(", ")}` : "Awaiting malware scan",
      ].filter(Boolean).join(" | "),
    }).select("id").single();

    if (dbErr) return NextResponse.json({ error: "Failed to save record" }, { status: 500 });

    let workflowId: string | null = null;
    try {
      workflowId = await startWorkflow("documentVaultPipelineWorkflow", TASK_QUEUES.VAULT, `vault-${doc.id}`, [
        { documentId: doc.id, userId: session.profileId, category, displayName: file.name },
      ]);
    } catch (workflowError) {
      console.warn("[vault upload] workflow start skipped", workflowError);
    }

    await logAudit({ action: "vault_upload_init", userId: session.profileId, resourceType: "vault_document", resourceId: doc.id, eventCategory: "vault", metadata: { file_name: file.name, category, enrollmentId, size: file.size, workflowId, sha256: digest.content_sha256, pii_flags: flags, aiClassification } });
    return NextResponse.json({ success: true, documentId: doc.id, fileName: file.name, status: workflowId ? "scanning" : "quarantine", workflowId });
  } catch (e: any) {
    console.error("[vault upload]", e);
    const message = e.message || "Internal server error";
    const status = /file|type|size|empty/i.test(message) ? 400 : 500;
    return NextResponse.json({ error: status === 400 ? message : "Internal server error" }, { status });
  }
}

function parseAIClassification(raw: FormDataEntryValue | null) {
  if (typeof raw !== "string" || !raw.trim()) return null;
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    return {
      label: String(parsed.label || "Document"),
      category: String(parsed.category || "general"),
      confidence: Number(parsed.confidence || 0),
      signals: Array.isArray(parsed.signals) ? parsed.signals.slice(0, 8).map(String) : [],
    };
  } catch {
    return null;
  }
}

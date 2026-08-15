import { randomUUID } from "crypto";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { writeAuditLog } from "@/lib/audit";
import { compressPdf } from "@/lib/stirling";
import type { ServiceType } from "@/lib/service-workflow";
import { assertAllowedVaultFile, containsMalwareSignature, hashes, piiFlags } from "@/lib/vault/security";

type UploadToClientVaultInput = {
  userId: string;
  enrollmentId: string;
  serviceType: ServiceType;
  file: File;
  pod?: string | null;
};

const DEFAULT_DELIVERABLE_TYPE: Record<ServiceType, string> = {
  tax: "tax_return",
  formation: "articles",
  insurance: "policy",
  notary: "notarized_document",
  bookkeeping: "monthly_report",
};

export function defaultDeliverableType(serviceType: ServiceType) {
  return DEFAULT_DELIVERABLE_TYPE[serviceType] || "other";
}

export async function uploadToClientVault(input: UploadToClientVaultInput) {
  const ext = input.file.name.split(".").pop() || "bin";
  const fileName = `${randomUUID()}.${ext}`;
  const path = `vault/${input.userId}/${input.serviceType}/${fileName}`;
  const admin = getSupabaseAdmin();
  const originalBuffer = Buffer.from(await input.file.arrayBuffer());
  assertAllowedVaultFile(input.file, originalBuffer);
  if (containsMalwareSignature(originalBuffer)) {
    await writeAuditLog({
      userId: input.userId,
      action: "staff_deliverable_rejected",
      resourceType: "vault_document",
      metadata: {
        enrollmentId: input.enrollmentId,
        serviceType: input.serviceType,
        fileName: input.file.name,
        reason: "malware_signature_detected",
      },
      eventCategory: "vault",
    });
    throw new Error("File failed security scan");
  }

  let uploadBuffer = originalBuffer;
  let compressionApplied = false;
  if ((input.file.type || "").toLowerCase() === "application/pdf") {
    try {
      uploadBuffer = await compressPdf(originalBuffer, input.file.name, "medium");
      compressionApplied = uploadBuffer.length > 0;
    } catch (error) {
      console.warn("[client-vault] Stirling compression skipped for staff deliverable", error);
      uploadBuffer = originalBuffer;
    }
  }
  const documentHashes = hashes(uploadBuffer);
  const detectedPii = piiFlags(uploadBuffer, input.file.type || "application/octet-stream");

  const { data: uploaded, error: uploadError } = await admin.storage.from("dfg-vault").upload(path, uploadBuffer, {
    contentType: input.file.type || "application/octet-stream",
    upsert: false,
  });
  if (uploadError) throw new Error(uploadError.message || "Vault upload failed");

  const { data: document, error: docError } = await admin.from("vault_documents").insert({
    user_id: input.userId,
    enrollment_id: input.enrollmentId,
    file_name: fileName,
    display_name: input.file.name,
    file_size: uploadBuffer.length,
    mime_type: input.file.type || "application/octet-stream",
    storage_path: uploaded?.key || path,
    storage_key: uploaded?.key || path,
    storage_bucket: "dfg-vault",
    category: input.serviceType,
    status: "clean",
    uploaded_via: "staff_upload",
    virus_scanned: true,
    virus_clean: true,
    content_sha256: documentHashes.content_sha256,
    content_md5: documentHashes.content_md5,
    pii_flags: detectedPii,
    routed_to: input.pod,
  }).select("id").single();
  if (docError || !document) throw new Error(docError?.message || "Could not create vault record");

  await writeAuditLog({
    userId: input.userId,
    action: "staff_deliverable_uploaded",
    resourceType: "vault_document",
    resourceId: document.id,
    metadata: {
      enrollmentId: input.enrollmentId,
      serviceType: input.serviceType,
      fileName: input.file.name,
      mimeType: input.file.type || "application/octet-stream",
      size: uploadBuffer.length,
      compressionApplied,
      piiFlags: detectedPii,
      scanResult: "clean",
    },
    eventCategory: "vault",
  });

  return { documentId: document.id, fileName, storagePath: uploaded?.key || path };
}

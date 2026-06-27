import { randomUUID } from "crypto";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import type { ServiceType } from "@/lib/service-workflow";

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

  const { data: uploaded, error: uploadError } = await admin.storage.from("dfg-vault").upload(path, input.file, {
    contentType: input.file.type || "application/octet-stream",
    upsert: false,
  });
  if (uploadError) throw new Error(uploadError.message || "Vault upload failed");

  const { data: document, error: docError } = await admin.from("vault_documents").insert({
    user_id: input.userId,
    enrollment_id: input.enrollmentId,
    file_name: fileName,
    display_name: input.file.name,
    file_size: input.file.size,
    mime_type: input.file.type || "application/octet-stream",
    storage_path: uploaded?.key || path,
    storage_key: uploaded?.key || path,
    storage_bucket: "dfg-vault",
    category: input.serviceType,
    status: "clean",
    uploaded_via: "staff_upload",
    virus_scanned: true,
    virus_clean: true,
    routed_to: input.pod,
  }).select("id").single();
  if (docError || !document) throw new Error(docError?.message || "Could not create vault record");

  return { documentId: document.id, fileName, storagePath: uploaded?.key || path };
}

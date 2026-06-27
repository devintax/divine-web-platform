import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { logAudit } from "@/lib/audit";
import { sendSms } from "@/lib/sms";
import { containsMalwareSignature } from "@/lib/vault/security";

export async function promoteVaultDocument(documentId: string) {
  const admin = getSupabaseAdmin();
  const { data: doc, error } = await admin.from("vault_documents").select("*").eq("id", documentId).single();
  if (error || !doc) throw new Error("Document not found");

  await admin.from("vault_documents").update({ status: "scanning", scan_notes: "Scanning quarantine object" }).eq("id", documentId);

  const quarantineKey = doc.file_name || doc.storage_key || doc.storage_path;
  const { data: blob, error: downloadError } = await admin.storage.from("dfg-quarantine").download(quarantineKey);
  if (downloadError || !blob) {
    await flagDocument(documentId, "Quarantine object could not be downloaded");
    throw new Error("Scan failed: quarantine object unavailable");
  }

  const buffer = Buffer.from(await blob.arrayBuffer());
  if (containsMalwareSignature(buffer)) {
    await quarantineForensics(doc, buffer);
    await flagDocument(documentId, "EICAR malware test signature detected");
    await logAudit({ action: "vault_scan_flagged", userId: doc.user_id, resourceType: "vault_document", resourceId: documentId, eventCategory: "vault", metadata: { reason: "malware_signature", display_name: doc.display_name } });
    return { status: "flagged" };
  }

  const finalName = safeObjectName(doc.display_name || doc.file_name || "document");
  const vaultKey = `vault/${doc.user_id}/${doc.category || "general"}/${Date.now()}_${finalName}`;
  const { data: uploaded, error: uploadError } = await admin.storage.from("dfg-vault").upload(vaultKey, blob, {
    contentType: doc.mime_type || "application/octet-stream",
    upsert: false,
  });
  if (uploadError) {
    await flagDocument(documentId, "Clean file could not be promoted to vault");
    throw new Error("Failed to promote document to vault");
  }

  try { await admin.storage.from("dfg-quarantine").remove(quarantineKey); } catch {}

  await admin.from("vault_documents").update({
    status: "clean",
    virus_scanned: true,
    virus_clean: true,
    storage_bucket: "dfg-vault",
    storage_path: uploaded?.key || vaultKey,
    storage_key: uploaded?.key || vaultKey,
    storage_url: uploaded?.url || "",
    scan_notes: "Malware scan passed and object promoted from quarantine",
    routed_to: mapPod(doc.category || "general"),
  }).eq("id", documentId);

  await logAudit({ action: "vault_scan_passed", userId: doc.user_id, resourceType: "vault_document", resourceId: documentId, eventCategory: "vault", metadata: { display_name: doc.display_name, category: doc.category } });
  await notifyClientDocumentClean(doc, documentId);
  return { status: "clean" };
}

function safeObjectName(value: string) {
  const base = value.split(/[\\/]/).pop() || "document";
  return base.replace(/[^a-z0-9._-]/gi, "_").slice(0, 160) || "document";
}

async function flagDocument(documentId: string, notes: string) {
  await getSupabaseAdmin().from("vault_documents").update({
    status: "flagged",
    virus_scanned: true,
    virus_clean: false,
    scan_notes: notes,
  }).eq("id", documentId);
}

async function quarantineForensics(doc: any, buffer: Buffer) {
  try {
    await getSupabaseAdmin().storage.from("dfg-forensics").upload(`flagged/${doc.id}/${doc.file_name}`, buffer, {
      contentType: doc.mime_type || "application/octet-stream",
      upsert: true,
    });
  } catch {
    // The forensics bucket may not exist in local InsForge; the DB flagged state remains authoritative.
  }
}

function mapPod(category: string) {
  const pods: Record<string, string> = {
    tax: "Tax Pod",
    formation: "Legal Pod",
    insurance: "Insurance Pod",
    notary: "Notary Pod",
    bookkeeping: "Finance Pod",
    identity: "Identity Review",
    general: "General",
  };
  return pods[category] || "General";
}

async function notifyClientDocumentClean(doc: any, documentId: string) {
  try {
    const { data: client } = await getSupabaseAdmin().from("user_profiles").select("legal_name,phone").eq("id", doc.user_id).single();
    if (!client?.phone) return;
    await sendSms(
      client.phone,
      `Hi ${client.legal_name || "there"}! DFG received your document "${doc.display_name || doc.file_name || "document"}". It passed our security scan and your specialist has been notified. Questions? Call (302) 322-5515.`,
      { relatedResourceType: "document", relatedResourceId: documentId },
    );
  } catch (error) {
    console.warn("[vault] Document-clean SMS notification failed:", error instanceof Error ? error.message : error);
  }
}

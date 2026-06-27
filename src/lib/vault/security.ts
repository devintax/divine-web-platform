import { createHash, randomUUID } from "crypto";

export const MAX_VAULT_FILE_BYTES = 50 * 1024 * 1024;

export const VALID_VAULT_CATEGORIES = ["tax", "formation", "insurance", "notary", "bookkeeping", "identity", "general"] as const;
export type VaultCategory = (typeof VALID_VAULT_CATEGORIES)[number];

const ALLOWED_MIME = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

const EXT_BY_MIME: Record<string, string> = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/png": "png",
  "application/msword": "doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
};

export function normalizeVaultCategory(value: unknown): VaultCategory {
  const category = String(value || "general").toLowerCase();
  return (VALID_VAULT_CATEGORIES as readonly string[]).includes(category) ? category as VaultCategory : "general";
}

export function hashes(buffer: Buffer) {
  return {
    content_sha256: createHash("sha256").update(buffer).digest("hex"),
    content_md5: createHash("md5").update(buffer).digest("hex"),
  };
}

export function assertAllowedVaultFile(file: File, buffer: Buffer) {
  if (file.size > MAX_VAULT_FILE_BYTES) throw new Error("File too large. Max 50MB.");
  if (!ALLOWED_MIME.has(file.type)) throw new Error("File type not allowed");
  if (!matchesMagicBytes(file.type, buffer)) throw new Error("File content does not match declared type");
}

function matchesMagicBytes(mime: string, buffer: Buffer) {
  if (mime === "application/pdf") return buffer.subarray(0, 4).toString("ascii") === "%PDF";
  if (mime === "image/jpeg") return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  if (mime === "image/png") return buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  if (mime === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") return buffer.subarray(0, 2).toString("ascii") === "PK";
  if (mime === "application/msword") return buffer.subarray(0, 4).equals(Buffer.from([0xd0, 0xcf, 0x11, 0xe0]));
  return false;
}

export function piiFlags(buffer: Buffer, mimeType: string) {
  if (!mimeType.includes("pdf") && !mimeType.includes("word") && !mimeType.includes("text")) return [];
  const sample = buffer.subarray(0, Math.min(buffer.length, 512 * 1024)).toString("latin1");
  const flags: string[] = [];
  if (/\b\d{3}-?\d{2}-?\d{4}\b/.test(sample)) flags.push("possible_ssn");
  if (/\b\d{2}-?\d{7}\b/.test(sample)) flags.push("possible_ein");
  if (/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i.test(sample)) flags.push("email_address");
  if (/\b(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/.test(sample)) flags.push("phone_number");
  return [...new Set(flags)];
}

export function containsMalwareSignature(buffer: Buffer) {
  return buffer.includes(Buffer.from("EICAR-STANDARD-ANTIVIRUS-TEST-FILE"));
}

export function vaultObjectName(userId: string, category: string, originalName: string) {
  const ext = EXT_BY_MIME[contentTypeFromName(originalName)] || originalName.split(".").pop()?.replace(/[^a-z0-9]/gi, "").toLowerCase() || "bin";
  return `${userId}/${category}/${randomUUID()}.${ext}`;
}

export function contentTypeFromName(name: string) {
  const ext = name.split(".").pop()?.toLowerCase();
  if (ext === "pdf") return "application/pdf";
  if (ext === "jpg" || ext === "jpeg") return "image/jpeg";
  if (ext === "png") return "image/png";
  if (ext === "doc") return "application/msword";
  if (ext === "docx") return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  return "application/octet-stream";
}


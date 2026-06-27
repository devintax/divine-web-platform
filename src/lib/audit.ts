import { getSupabaseAdmin } from "./supabase-admin";
import type { Json } from "./database.types";

interface AuditParams {
  action: string;
  userId?: string | null;
  staffId?: string | null;
  resourceType?: string;
  resourceId?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  eventCategory?: "auth" | "vault" | "intake" | "admin" | "workflow" | "billing" | "system" | "compliance" | "rbac";
}

const SENSITIVE_KEYS = ["ssn", "ein", "password", "token", "credit_card", "bank_account", "dob", "secret", "key"];

function scrubPII(value: unknown): Json {
  if (value === null || value === undefined) return null;
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return value;
  if (Array.isArray(value)) return value.map(scrubPII);
  if (typeof value === "object") {
    const clean: Record<string, Json> = {};
    for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
      const isSensitive = SENSITIVE_KEYS.some((term) => key.toLowerCase().includes(term));
      clean[key] = isSensitive ? "[REDACTED]" : scrubPII(nested);
    }
    return clean;
  }
  return String(value);
}

export async function logAudit(params: AuditParams) {
  const admin = getSupabaseAdmin();
  const { error } = await admin.from("audit_logs").insert({
    action: params.action,
    user_id: params.userId || null,
    staff_id: params.staffId || null,
    resource_type: params.resourceType || null,
    resource_id: params.resourceId || null,
    metadata: params.metadata ? scrubPII(params.metadata) : null,
    event_category: params.eventCategory || null,
    user_agent: params.userAgent || null,
  });
  if (error) {
    console.error("[audit] Failed to log:", error.message, params.action);
  }
}

export const writeAuditLog = logAudit;

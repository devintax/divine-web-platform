import { getSupabaseAdmin } from "./supabase-admin";
import type { Json } from "./database.types";

interface AuditParams {
  action: string;
  userId?: string | null;
  staffId?: string | null;
  resourceType?: string;
  resourceId?: string;
  metadata?: Record<string, string | number | boolean | null>;
  ipAddress?: string;
  userAgent?: string;
}

export async function logAudit(params: AuditParams) {
  const admin = getSupabaseAdmin();
  const { error } = await admin.from("audit_logs").insert({
    action: params.action,
    user_id: params.userId || null,
    staff_id: params.staffId || null,
    resource_type: params.resourceType || null,
    resource_id: params.resourceId || null,
    metadata: (params.metadata as Json) || null,
    user_agent: params.userAgent || null,
  });
  if (error) {
    console.error("[audit] Failed to log:", error.message, params.action);
  }
}

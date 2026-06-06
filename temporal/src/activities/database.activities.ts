import { getSupabaseAdmin } from "../lib/insforge";

export async function updateEnrollmentStatus(params: { enrollmentId: string; status: string; progress: number }): Promise<void> {
  await getSupabaseAdmin().from('service_enrollments')
    .update({ status: params.status, progress: params.progress, updated_at: new Date().toISOString() })
    .eq('id', params.enrollmentId);
}

export async function updateFormationStatus(params: { formationId: string; status: string; sosConfirmationNumber?: string }): Promise<void> {
  await getSupabaseAdmin().from('formations')
    .update({ filing_status: params.status, ...(params.sosConfirmationNumber ? { sos_confirmation_number: params.sosConfirmationNumber } : {}) })
    .eq('id', params.formationId);
}

export async function updateVaultDocumentStatus(params: { documentId: string; status: string; virusClean?: boolean; storagePath?: string }): Promise<void> {
  await getSupabaseAdmin().from('vault_documents')
    .update({ status: params.status, virus_scanned: true, virus_clean: params.virusClean, storage_path: params.storagePath })
    .eq('id', params.documentId);
}

export async function writeAuditLog(params: {
  userId?: string; staffId?: string; action: string;
  resourceType?: string; resourceId?: string; metadata?: Record<string, unknown>;
}): Promise<void> {
  await getSupabaseAdmin().from('audit_logs').insert({
    user_id: params.userId, staff_id: params.staffId,
    action: params.action, resource_type: params.resourceType, resource_id: params.resourceId,
    metadata: params.metadata || {}, created_at: new Date().toISOString(),
  });
}

export async function getEnrollmentById(enrollmentId: string) {
  const { data } = await getSupabaseAdmin().from('service_enrollments')
    .eq('id', enrollmentId)
    .single();
  return data;
}

export async function softDeleteEnrollment(enrollmentId: string): Promise<void> {
  await getSupabaseAdmin().from('service_enrollments').update({ status: 'cancelled' }).eq('id', enrollmentId);
}

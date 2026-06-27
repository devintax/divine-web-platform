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

export async function getExpiredLeads(): Promise<any[]> {
  const { data } = await getSupabaseAdmin().from('service_enrollments').select('*');
  const sixtyDaysAgo = Date.now() - 60 * 24 * 60 * 60 * 1000;
  return (data || []).filter((lead: any) => {
    const createdAt = lead.created_at ? new Date(lead.created_at).getTime() : Date.now();
    return lead.status === 'draft' && createdAt <= sixtyDaysAgo;
  });
}

export async function getFormationsDueForCompliance(): Promise<any[]> {
  const { data } = await getSupabaseAdmin().from('formations').select('*');
  const now = Date.now();
  const ninetyDaysMs = 90 * 24 * 60 * 60 * 1000;
  return (data || [])
    .map((formation: any) => {
      const dueAt = formation.annual_report_due ? new Date(formation.annual_report_due).getTime() : Number.NaN;
      const daysOut = Number.isFinite(dueAt) ? Math.max(0, Math.floor((dueAt - now) / 86400000)) : null;
      return { ...formation, days_out: daysOut };
    })
    .filter((formation: any) => formation.days_out !== null && formation.days_out <= 90 && formation.days_out * 86400000 <= ninetyDaysMs);
}

export async function getPendingCallbacks(): Promise<any[]> {
  const { data } = await getSupabaseAdmin().from('callback_queue').select('*');
  return (data || []).filter((callback: any) => callback.status === 'pending');
}

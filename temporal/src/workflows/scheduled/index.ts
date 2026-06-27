import { proxyActivities } from '@temporalio/workflow';
import type { DatabaseActivities } from '../../activities/types';

const db = proxyActivities<DatabaseActivities>({ startToCloseTimeout: '2m' });

export async function dataRetentionCleanupWorkflow(): Promise<void> {
  const expiredLeads = await db.getExpiredLeads();
  if (expiredLeads?.length) {
    for (const lead of expiredLeads) {
      await db.softDeleteEnrollment(lead.id);
      await db.writeAuditLog({ action: 'data_retention_auto_delete', resourceType: 'enrollment', resourceId: lead.id, metadata: { reason: 'GLBA_60_DAY_RETENTION', userId: lead.user_id } });
    }
  }
}

export async function annualReportComplianceWorkflow(): Promise<void> {
  const formations = await db.getFormationsDueForCompliance();
  if (formations?.length) {
    for (const f of formations) {
      if (f.user_profiles?.email) {
        await db.writeAuditLog({ action: 'compliance_alert_sent', resourceType: 'formation', resourceId: f.id, metadata: { alertType: 'annual_report', daysOut: f.days_out } });
      }
    }
  }
}

export async function morningDigestWorkflow(): Promise<void> {
  const callbacks = await db.getPendingCallbacks();
  if (callbacks?.length) {
    await db.writeAuditLog({ action: 'morning_digest_sent', resourceType: 'system', resourceId: 'system', metadata: { pendingCallbacks: callbacks.length } });
  }
}

import { proxyActivities, defineSignal, setHandler, sleep } from '@temporalio/workflow';
import type { EmailActivities, DatabaseActivities, StorageActivities } from '../activities/types';

const email   = proxyActivities<EmailActivities>({ startToCloseTimeout: '30s' });
const db      = proxyActivities<DatabaseActivities>({ startToCloseTimeout: '30s' });
const storage = proxyActivities<StorageActivities>({ startToCloseTimeout: '30s' });

export const kycVerifiedSignal      = defineSignal<[void]>('kycVerified');
export const sessionCompletedSignal = defineSignal<[void]>('sessionCompleted');

export async function notaryServicesWorkflow(params: {
  enrollmentId: string; userId: string; clientEmail: string; clientName: string;
  documentType: string; signerCount: number; scheduledTime: string;
}): Promise<void> {
  await db.updateEnrollmentStatus({ enrollmentId: params.enrollmentId, status: 'pending', progress: 10 });
  await email.sendWelcomeEmail({ to: params.clientEmail, name: params.clientName, service: 'Notary Services' });
  await email.sendStaffNotificationEmail({ service: 'Notary Services', clientName: params.clientName, clientEmail: params.clientEmail, pod: 'Notary Pod', enrollmentId: params.enrollmentId, intakeSummary: { documentType: params.documentType, signerCount: params.signerCount, scheduledTime: params.scheduledTime } });

  const uploadLink = await storage.generateUploadLink({ userId: params.userId, recipientEmail: params.clientEmail, purpose: `Notary Documents`, expiresInHours: 24 });
  await email.sendMissingDocumentEmail({ to: params.clientEmail, name: params.clientName, service: 'Notary Services', missingItems: [`${params.documentType} to be notarized`, 'Government-issued Photo ID (for each signer)'], uploadLink });

  await email.sendStatusUpdateEmail({ to: params.clientEmail, name: params.clientName, service: 'Notary Services', status: 'Session Scheduled', message: `Your Remote Online Notary session is scheduled for ${params.scheduledTime}.` });
  await db.updateEnrollmentStatus({ enrollmentId: params.enrollmentId, status: 'active', progress: 40 });

  let kycDone = false;
  setHandler(kycVerifiedSignal, () => { kycDone = true; });
  for (let i = 0; i < 48; i++) { await sleep('30m'); if (kycDone) break; }
  await db.updateEnrollmentStatus({ enrollmentId: params.enrollmentId, status: 'active', progress: 70 });

  let sessionDone = false;
  setHandler(sessionCompletedSignal, () => { sessionDone = true; });
  for (let i = 0; i < 96; i++) { await sleep('30m'); if (sessionDone) break; }

  await db.updateEnrollmentStatus({ enrollmentId: params.enrollmentId, status: 'completed', progress: 100 });
  await email.sendStatusUpdateEmail({ to: params.clientEmail, name: params.clientName, service: 'Notary Services', status: 'Notarized!', message: 'Your document has been successfully notarized. The signed document is available in your secure vault.' });
  await db.writeAuditLog({ userId: params.userId, action: 'notary_workflow_completed', resourceType: 'enrollment', resourceId: params.enrollmentId, metadata: { documentType: params.documentType, signerCount: params.signerCount } });
}

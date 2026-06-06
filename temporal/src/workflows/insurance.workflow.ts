import { proxyActivities, defineSignal, setHandler, sleep } from '@temporalio/workflow';
import type { EmailActivities, DatabaseActivities, StorageActivities } from '../activities/types';

const email   = proxyActivities<EmailActivities>({ startToCloseTimeout: '30s' });
const db      = proxyActivities<DatabaseActivities>({ startToCloseTimeout: '30s' });
const storage = proxyActivities<StorageActivities>({ startToCloseTimeout: '30s' });

export const quoteSelectedSignal = defineSignal<[string]>('quoteSelected');
export const policyBoundSignal   = defineSignal<[void]>('policyBound');

export async function autoInsuranceWorkflow(params: {
  enrollmentId: string; userId: string; clientEmail: string; clientName: string;
  clientPhone: string; zipCode: string; vehicleUsage: string; driverHistory: string;
}): Promise<void> {
  await db.updateEnrollmentStatus({ enrollmentId: params.enrollmentId, status: 'pending', progress: 10 });
  await email.sendWelcomeEmail({ to: params.clientEmail, name: params.clientName, service: 'Auto Insurance' });
  await email.sendStaffNotificationEmail({ service: 'Auto Insurance', clientName: params.clientName, clientEmail: params.clientEmail, pod: 'Insurance Pod', enrollmentId: params.enrollmentId, intakeSummary: { zipCode: params.zipCode, vehicleUsage: params.vehicleUsage, driverHistory: params.driverHistory } });

  const uploadLink = await storage.generateUploadLink({ userId: params.userId, recipientEmail: params.clientEmail, purpose: 'Auto Insurance Documents', expiresInHours: 48 });
  await email.sendMissingDocumentEmail({ to: params.clientEmail, name: params.clientName, service: 'Auto Insurance', missingItems: ["Valid Driver's License", 'Current auto insurance declaration page (if insured)', 'Vehicle registration'], uploadLink });
  await db.updateEnrollmentStatus({ enrollmentId: params.enrollmentId, status: 'active', progress: 30 });

  await email.sendStatusUpdateEmail({ to: params.clientEmail, name: params.clientName, service: 'Auto Insurance', status: 'Quotes Being Prepared', message: 'Our licensed broker is preparing competitive quotes from multiple carriers for your ZIP code.' });

  let selectedCarrier = '';
  setHandler(quoteSelectedSignal, (carrier) => { selectedCarrier = carrier; });
  for (let i = 0; i < 28; i++) { await sleep('6h'); if (selectedCarrier) break; }
  await db.updateEnrollmentStatus({ enrollmentId: params.enrollmentId, status: 'active', progress: 70 });

  let policyBound = false;
  setHandler(policyBoundSignal, () => { policyBound = true; });
  for (let i = 0; i < 20; i++) { await sleep('6h'); if (policyBound) break; }

  await db.updateEnrollmentStatus({ enrollmentId: params.enrollmentId, status: 'completed', progress: 100 });
  await email.sendStatusUpdateEmail({ to: params.clientEmail, name: params.clientName, service: 'Auto Insurance', status: 'Policy Active!', message: `Your auto insurance policy is now active. Your policy documents are in your secure vault.` });
  await db.writeAuditLog({ userId: params.userId, action: 'insurance_workflow_completed', resourceType: 'enrollment', resourceId: params.enrollmentId });
}

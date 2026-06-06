import { proxyActivities, defineSignal, setHandler, sleep } from '@temporalio/workflow';
import type { EmailActivities, DatabaseActivities, StorageActivities } from '../activities/types';

const email   = proxyActivities<EmailActivities>({ startToCloseTimeout: '30s' });
const db      = proxyActivities<DatabaseActivities>({ startToCloseTimeout: '30s' });
const storage = proxyActivities<StorageActivities>({ startToCloseTimeout: '30s' });

export const bankConnectedSignal = defineSignal<[void]>('bankConnected');
export const setupCompleteSignal = defineSignal<[void]>('setupComplete');

export async function bookkeepingOnboardingWorkflow(params: {
  enrollmentId: string; userId: string; clientEmail: string; clientName: string;
  businessStage: string; transactionVolume: string; currentTools: string; reportingGoal: string;
}): Promise<void> {
  await db.updateEnrollmentStatus({ enrollmentId: params.enrollmentId, status: 'pending', progress: 10 });
  await email.sendWelcomeEmail({ to: params.clientEmail, name: params.clientName, service: 'Bookkeeping' });
  await email.sendStaffNotificationEmail({ service: 'Bookkeeping', clientName: params.clientName, clientEmail: params.clientEmail, pod: 'Finance Pod', enrollmentId: params.enrollmentId, intakeSummary: { businessStage: params.businessStage, transactionVolume: params.transactionVolume, currentTools: params.currentTools, reportingGoal: params.reportingGoal } });

  const uploadLink = await storage.generateUploadLink({ userId: params.userId, recipientEmail: params.clientEmail, purpose: 'Bookkeeping Onboarding', expiresInHours: 72 });
  const docsNeeded = ['Last 3 months of bank statements', 'Last 3 months of credit card statements'];
  if (params.currentTools !== 'Nothing yet') docsNeeded.push(`Export from ${params.currentTools} (last 12 months)`);
  await email.sendMissingDocumentEmail({ to: params.clientEmail, name: params.clientName, service: 'Bookkeeping', missingItems: docsNeeded, uploadLink });
  await db.updateEnrollmentStatus({ enrollmentId: params.enrollmentId, status: 'active', progress: 25 });

  let bankConnected = false;
  setHandler(bankConnectedSignal, () => { bankConnected = true; });
  for (let i = 0; i < 28; i++) { await sleep('6h'); if (bankConnected) break; }

  await email.sendStatusUpdateEmail({ to: params.clientEmail, name: params.clientName, service: 'Bookkeeping', status: 'Chart of Accounts Setup', message: 'Your bookkeeper is setting up your Chart of Accounts. You will receive your first monthly report within 5 business days.' });
  await db.updateEnrollmentStatus({ enrollmentId: params.enrollmentId, status: 'active', progress: 60 });

  let setupDone = false;
  setHandler(setupCompleteSignal, () => { setupDone = true; });
  for (let i = 0; i < 40; i++) { await sleep('6h'); if (setupDone) break; }

  await db.updateEnrollmentStatus({ enrollmentId: params.enrollmentId, status: 'completed', progress: 100 });
  await email.sendStatusUpdateEmail({ to: params.clientEmail, name: params.clientName, service: 'Bookkeeping', status: 'Bookkeeping Active!', message: 'Your books are set up and running! You will receive monthly reports in your secure vault.' });
  await db.writeAuditLog({ userId: params.userId, action: 'bookkeeping_workflow_completed', resourceType: 'enrollment', resourceId: params.enrollmentId });
}

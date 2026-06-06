import { proxyActivities, sleep, defineSignal, setHandler } from '@temporalio/workflow';
import type { EmailActivities, DatabaseActivities, StorageActivities, PaymentActivities } from '../activities/types';

const email   = proxyActivities<EmailActivities>({ startToCloseTimeout: '30s' });
const db      = proxyActivities<DatabaseActivities>({ startToCloseTimeout: '30s' });
const storage = proxyActivities<StorageActivities>({ startToCloseTimeout: '30s' });
const payment = proxyActivities<PaymentActivities>({ startToCloseTimeout: '60s' });

export const taxDocumentsUploadedSignal = defineSignal<[string[]]>('taxDocumentsUploaded');
export const reviewCompleteSignal    = defineSignal<[void]>('reviewComplete');
export const clientApprovedSignal    = defineSignal<[void]>('clientApproved');

export async function taxPreparationWorkflow(params: {
  enrollmentId: string; userId: string; clientEmail: string; clientName: string;
  filingStatus: string; incomeSources: string[]; deductions: string[];
}): Promise<void> {
  await db.updateEnrollmentStatus({ enrollmentId: params.enrollmentId, status: 'pending', progress: 10 });
  await email.sendWelcomeEmail({ to: params.clientEmail, name: params.clientName, service: 'Tax Preparation' });
  await email.sendStaffNotificationEmail({ service: 'Tax Preparation', clientName: params.clientName, clientEmail: params.clientEmail, pod: 'Tax Pod', enrollmentId: params.enrollmentId, intakeSummary: { filingStatus: params.filingStatus, incomeSources: params.incomeSources, deductions: params.deductions } });

  const requiredDocs: string[] = [];
  if (params.incomeSources.includes('W-2 (Employee)')) requiredDocs.push('W-2 form(s)');
  if (params.incomeSources.includes('1099 / Freelance')) requiredDocs.push('All 1099 forms');
  if (params.incomeSources.includes('Rental Income')) requiredDocs.push('Schedule E docs');
  if (params.incomeSources.includes('Stocks / Crypto')) requiredDocs.push('1099-B or crypto CSV');
  if (params.deductions.includes('Bought a Home')) requiredDocs.push('Form 1098');
  requiredDocs.push('Prior year tax return', 'Government-issued Photo ID', 'SS cards for all dependents');

  const uploadLink = await storage.generateUploadLink({ userId: params.userId, recipientEmail: params.clientEmail, purpose: 'Tax Documents Upload', expiresInHours: 72 });
  await email.sendMissingDocumentEmail({ to: params.clientEmail, name: params.clientName, service: 'Tax Preparation', missingItems: requiredDocs, uploadLink });
  await db.updateEnrollmentStatus({ enrollmentId: params.enrollmentId, status: 'active', progress: 25 });

  let docsUploaded = false;
  setHandler(taxDocumentsUploadedSignal, () => { docsUploaded = true; });
  for (let i = 0; i < 56; i++) { await sleep('6h'); if (docsUploaded) break; }

  await db.updateEnrollmentStatus({ enrollmentId: params.enrollmentId, status: 'active', progress: 60 });
  await email.sendStatusUpdateEmail({ to: params.clientEmail, name: params.clientName, service: 'Tax Preparation', status: 'In Preparation', message: 'Your tax return is being prepared. You will receive a review copy within 3-5 business days.' });

  let reviewDone = false;
  setHandler(reviewCompleteSignal, () => { reviewDone = true; });
  for (let i = 0; i < 40; i++) { await sleep('6h'); if (reviewDone) break; }

  await db.updateEnrollmentStatus({ enrollmentId: params.enrollmentId, status: 'active', progress: 80 });
  await email.sendStatusUpdateEmail({ to: params.clientEmail, name: params.clientName, service: 'Tax Preparation', status: 'Ready for Review', message: 'Your tax return draft is ready for review in the portal. Please approve it for filing.' });

  let clientOk = false;
  setHandler(clientApprovedSignal, () => { clientOk = true; });
  for (let i = 0; i < 28; i++) { await sleep('6h'); if (clientOk) break; }

  await db.updateEnrollmentStatus({ enrollmentId: params.enrollmentId, status: 'completed', progress: 100 });
  await email.sendStatusUpdateEmail({ to: params.clientEmail, name: params.clientName, service: 'Tax Preparation', status: 'Filed!', message: 'Your tax return has been electronically filed with the IRS. Your confirmation is in your secure vault.' });
  await db.writeAuditLog({ userId: params.userId, action: 'tax_workflow_completed', resourceType: 'enrollment', resourceId: params.enrollmentId });
}

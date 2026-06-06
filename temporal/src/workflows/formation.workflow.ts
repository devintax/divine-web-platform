import { proxyActivities, sleep, defineSignal, setHandler } from '@temporalio/workflow';
import type { EmailActivities, DatabaseActivities, StorageActivities, PaymentActivities } from '../activities/types';

const email   = proxyActivities<EmailActivities>({ startToCloseTimeout: '30s' });
const db      = proxyActivities<DatabaseActivities>({ startToCloseTimeout: '30s' });
const storage = proxyActivities<StorageActivities>({ startToCloseTimeout: '30s' });
const payment = proxyActivities<PaymentActivities>({ startToCloseTimeout: '60s' });

export const documentsUploadedSignal = defineSignal<[string[]]>('documentsUploaded');
export const paymentCompletedSignal  = defineSignal<[string]>('paymentCompleted');
export const staffApprovedSignal     = defineSignal<[string]>('staffApproved');

export async function businessFormationWorkflow(params: {
  enrollmentId: string; userId: string; clientEmail: string; clientName: string;
  businessName: string; entityType: string; state: string; useDivineAgent: boolean; intakeData: Record<string, unknown>;
}): Promise<void> {
  await db.updateEnrollmentStatus({ enrollmentId: params.enrollmentId, status: 'pending', progress: 10 });
  await db.writeAuditLog({ userId: params.userId, action: 'formation_workflow_started', resourceType: 'enrollment', resourceId: params.enrollmentId });
  await email.sendWelcomeEmail({ to: params.clientEmail, name: params.clientName, service: 'Business Formation' });
  await email.sendStaffNotificationEmail({ service: 'Business Formation', clientName: params.clientName, clientEmail: params.clientEmail, pod: 'Legal Pod', enrollmentId: params.enrollmentId, intakeSummary: params.intakeData });

  await db.updateEnrollmentStatus({ enrollmentId: params.enrollmentId, status: 'active', progress: 25 });
  const uploadLink = await storage.generateUploadLink({ userId: params.userId, recipientEmail: params.clientEmail, purpose: 'Business Formation Documents', expiresInHours: 48 });
  await email.sendMissingDocumentEmail({ to: params.clientEmail, name: params.clientName, service: 'Business Formation', missingItems: ['Government-issued Photo ID for each owner', 'Signed Operating Agreement (if available)'], uploadLink });

  let documentsReceived = false; let staffApproved = false;
  setHandler(documentsUploadedSignal, () => { documentsReceived = true; });
  setHandler(staffApprovedSignal, () => { staffApproved = true; });
  for (let i = 0; i < 28; i++) {
    await sleep('6h');
    if (documentsReceived || staffApproved) break;
  }

  await db.updateEnrollmentStatus({ enrollmentId: params.enrollmentId, status: 'active', progress: 50 });
  const paymentUrl = await payment.createStripePaymentLink({ service: 'Business Formation', amount: 29900, userId: params.userId, enrollmentId: params.enrollmentId, description: `${params.entityType} formation in ${params.state}` });
  await email.sendStatusUpdateEmail({ to: params.clientEmail, name: params.clientName, service: 'Business Formation', status: 'Ready for Payment', message: `Your ${params.entityType} in ${params.state} is ready to be filed. Please complete payment to proceed: ${paymentUrl}` });

  let paymentCompleted = false;
  setHandler(paymentCompletedSignal, () => { paymentCompleted = true; });
  for (let i = 0; i < 72; i++) { await sleep('1h'); if (paymentCompleted) break; }

  await db.updateEnrollmentStatus({ enrollmentId: params.enrollmentId, status: 'active', progress: 75 });
  await email.sendStatusUpdateEmail({ to: params.clientEmail, name: params.clientName, service: 'Business Formation', status: 'Filed with State', message: `Your ${params.entityType} has been submitted to the ${params.state} Secretary of State. Typical processing time is 5-10 business days.` });

  await sleep('21d');

  await db.updateFormationStatus({ formationId: params.enrollmentId, status: 'approved' });
  await db.updateEnrollmentStatus({ enrollmentId: params.enrollmentId, status: 'completed', progress: 100 });
  await email.sendStatusUpdateEmail({ to: params.clientEmail, name: params.clientName, service: 'Business Formation', status: 'Approved!', message: `Congratulations! Your ${params.businessName} ${params.entityType} has been officially approved by the state.` });
  await db.writeAuditLog({ userId: params.userId, action: 'formation_workflow_completed', resourceType: 'enrollment', resourceId: params.enrollmentId });
}

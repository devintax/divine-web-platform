# Divine Financial Group — Complete Platform Build
# All Service Modules + Temporal.io Workflow Orchestration
## Verdant.ai Agent Prompt · Full Stack Implementation

---

## MISSION STATEMENT

Build the **complete, fully functional Divine Financial Group platform** — every
service module, every page, every workflow — wired to InsForge as the backend
and **Temporal.io as the durable workflow engine** for all complex, long-running,
multi-step business processes.

You are not building a prototype. This is a production-quality financial services
platform. Every feature described below must be fully implemented, not mocked.

---

## SYSTEM ARCHITECTURE OVERVIEW

```
┌─────────────────────────────────────────────────────────────┐
│                    DIVINE FINANCIAL GROUP                    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Next.js 14 (Vercel)          ←→   InsForge Backend         │
│  ├── Public Website (4 pages)        (Docker Desktop)        │
│  ├── Client Portal (5 modules)   ├── PostgreSQL             │
│  └── Next.js API Routes         ├── Auth                   │
│                                  ├── Storage (Vault)        │
│           ↓ trigger              └── REST API               │
│                                                             │
│  Temporal.io (Docker Desktop)                               │
│  ├── Business Formation Workflow                            │
│  ├── Tax Preparation Workflow                               │
│  ├── Document Vault Pipeline                                │
│  ├── Insurance Quote Workflow                               │
│  ├── Notary Session Workflow                                │
│  ├── Bookkeeping Onboarding Workflow                        │
│  ├── Data Retention Cleanup (Scheduled)                     │
│  ├── Annual Report Compliance (Scheduled)                   │
│  └── Morning Digest (Scheduled)                             │
│                                                             │
│  External Services:                                         │
│  ├── Resend (email)                                         │
│  ├── Twilio (SMS)                                           │
│  └── Stripe (payments)                                      │
└─────────────────────────────────────────────────────────────┘
```

**Rule:** Simple CRUD goes directly through InsForge SDK.
**Rule:** Anything long-running, multi-step, or failure-sensitive goes through Temporal.
**Rule:** Temporal Workers run as a separate Node.js process alongside Next.js.

---

## PART 1: VERIFY ALL INFRASTRUCTURE IS RUNNING

Before writing any code, verify all backend services are live:

```bash
# 1 — Docker Desktop running
docker info

# 2 — InsForge running
curl http://localhost:7130/health

# 3 — Temporal running (gRPC frontend on 7233, Web UI on 8080)
curl http://localhost:8080
# OR check via Temporal CLI:
temporal namespace list

# If any service is down, start it:
# InsForge: cd ../insforge-backend && docker compose -f docker-compose.prod.yml up -d
# Temporal: temporal server start-dev --db-filename temporal.db
#   (if using dev mode) OR docker compose up in their samples-server repo
```

### Verify Temporal namespace

```bash
# Create the DFG namespace if it doesn't exist
temporal namespace create divine-financial --retention 30d

# Confirm
temporal namespace describe divine-financial
```

---

## PART 2: TEMPORAL WORKER SETUP

Temporal Workers run as a **dedicated Node.js process** — completely separate
from the Next.js server. The Worker polls Temporal Server for tasks and
executes Workflows and Activities.

### 2A. Create the Worker package structure

```
divine-web-platform/
├── temporal/                   ← All Temporal code lives here
│   ├── src/
│   │   ├── client.ts           ← Temporal Client (used by Next.js API routes)
│   │   ├── worker.ts           ← Worker entry point (runs separately)
│   │   ├── workflows/          ← Workflow definitions (MUST be deterministic)
│   │   │   ├── formation.workflow.ts
│   │   │   ├── tax.workflow.ts
│   │   │   ├── insurance.workflow.ts
│   │   │   ├── notary.workflow.ts
│   │   │   ├── bookkeeping.workflow.ts
│   │   │   ├── vault.workflow.ts
│   │   │   └── scheduled/
│   │   │       ├── retention.workflow.ts
│   │   │       ├── compliance.workflow.ts
│   │   │       └── digest.workflow.ts
│   │   └── activities/         ← Activity definitions (can be non-deterministic)
│   │       ├── email.activities.ts
│   │       ├── sms.activities.ts
│   │       ├── database.activities.ts
│   │       ├── storage.activities.ts
│   │       ├── payment.activities.ts
│   │       └── external.activities.ts
│   ├── package.json
│   └── tsconfig.json
```

### 2B. Install Temporal dependencies

```bash
# In the project root
npm install \
  @temporalio/client \
  @temporalio/worker \
  @temporalio/workflow \
  @temporalio/activity

# Temporal needs its own tsconfig because Workflow code runs in a sandbox
```

### 2C. Temporal Client — `temporal/src/client.ts`

Workflow Clients are embedded in your application code (even including serverless Next.js API Routes), and connect to Temporal Server via gRPC. They are the only way to schedule new Workflow Executions with Temporal Server.

```typescript
import { Connection, Client } from '@temporalio/client';

let client: Client | null = null;

export async function getTemporalClient(): Promise<Client> {
  if (client) return client;

  const connection = await Connection.connect({
    address: process.env.TEMPORAL_ADDRESS || 'localhost:7233',
  });

  client = new Client({
    connection,
    namespace: process.env.TEMPORAL_NAMESPACE || 'divine-financial',
  });

  return client;
}

// Task queue names — one per service domain
export const TASK_QUEUES = {
  FORMATION:   'dfg-formation',
  TAX:         'dfg-tax',
  INSURANCE:   'dfg-insurance',
  NOTARY:      'dfg-notary',
  BOOKKEEPING: 'dfg-bookkeeping',
  VAULT:       'dfg-vault',
  SCHEDULED:   'dfg-scheduled',
} as const;
```

### 2D. Worker Entry Point — `temporal/src/worker.ts`

The worker runs until it encounters an unexpected error or the process receives a shutdown signal registered on the SDK Runtime object.

```typescript
import { NativeConnection, Worker, Runtime } from '@temporalio/worker';
import * as emailActivities    from './activities/email.activities';
import * as smsActivities      from './activities/sms.activities';
import * as dbActivities       from './activities/database.activities';
import * as storageActivities  from './activities/storage.activities';
import * as paymentActivities  from './activities/payment.activities';
import * as externalActivities from './activities/external.activities';

const allActivities = {
  ...emailActivities,
  ...smsActivities,
  ...dbActivities,
  ...storageActivities,
  ...paymentActivities,
  ...externalActivities,
};

async function run() {
  Runtime.install({ logger: { level: 'INFO' } });

  const connection = await NativeConnection.connect({
    address: process.env.TEMPORAL_ADDRESS || 'localhost:7233',
  });

  // One worker per task queue — all queues run in this single process
  const queues = [
    'dfg-formation',
    'dfg-tax',
    'dfg-insurance',
    'dfg-notary',
    'dfg-bookkeeping',
    'dfg-vault',
    'dfg-scheduled',
  ];

  const workers = await Promise.all(
    queues.map(taskQueue =>
      Worker.create({
        connection,
        namespace: process.env.TEMPORAL_NAMESPACE || 'divine-financial',
        taskQueue,
        workflowsPath: require.resolve('./workflows/index'),
        activities: allActivities,
      })
    )
  );

  console.log('🔄 Divine Financial Group — Temporal Workers running');
  console.log(`   Namespace: divine-financial`);
  console.log(`   Task Queues: ${queues.join(', ')}`);

  await Promise.all(workers.map(w => w.run()));
}

run().catch(err => {
  console.error('Worker fatal error:', err);
  process.exit(1);
});
```

Add to `package.json` scripts:

```json
{
  "scripts": {
    "worker": "ts-node temporal/src/worker.ts",
    "worker:dev": "ts-node --watch temporal/src/worker.ts",
    "dev:full": "concurrently \"npm run dev\" \"npm run worker:dev\""
  }
}
```

Install concurrently: `npm install -D concurrently`

Run everything together: `npm run dev:full`

---

## PART 3: ALL ACTIVITY DEFINITIONS

Workflows must be deterministic, so you perform non-deterministic work in Activities. The TypeScript SDK bundles Workflow code and runs it inside a deterministic sandbox. Side effects and access to external state must be done through Activities because Activity outputs are recorded in the Event History.

Activities can: call databases, send emails, call APIs, upload files,
charge payments. Workflows can only: call Activities, sleep, wait for signals.

### `temporal/src/activities/email.activities.ts`

```typescript
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendWelcomeEmail(params: {
  to: string;
  name: string;
  service: string;
}): Promise<void> {
  await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL!,
    to: params.to,
    subject: `Your ${params.service} request is being processed — Divine Financial Group`,
    html: `
      <h2>Thank you, ${params.name}!</h2>
      <p>Your <strong>${params.service}</strong> intake has been received and
      your Divine Financial Group team is now reviewing your information.</p>
      <p>We will be in touch within one business day.</p>
      <p>If you have questions, contact us at:
        <a href="tel:3023225515">(302) 322-5515</a> |
        <a href="mailto:info@dfgbusiness.com">info@dfgbusiness.com</a>
      </p>
      <p>— Divine Financial Group<br>
         622 E. Basin Road, Suite A, New Castle, DE 19720</p>
    `,
  });
}

export async function sendStaffNotificationEmail(params: {
  service: string;
  clientName: string;
  clientEmail: string;
  pod: string;
  enrollmentId: string;
  intakeSummary: Record<string, unknown>;
}): Promise<void> {
  await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL!,
    to: process.env.RESEND_REPLY_TO!, // info@dfgbusiness.com
    subject: `[NEW] ${params.service} intake — ${params.clientName} → ${params.pod}`,
    html: `
      <h2>New ${params.service} Intake Submitted</h2>
      <table>
        <tr><td><strong>Client:</strong></td><td>${params.clientName}</td></tr>
        <tr><td><strong>Email:</strong></td><td>${params.clientEmail}</td></tr>
        <tr><td><strong>Pod:</strong></td><td>${params.pod}</td></tr>
        <tr><td><strong>Enrollment ID:</strong></td><td>${params.enrollmentId}</td></tr>
      </table>
      <h3>Intake Data:</h3>
      <pre>${JSON.stringify(params.intakeSummary, null, 2)}</pre>
    `,
  });
}

export async function sendStatusUpdateEmail(params: {
  to: string;
  name: string;
  service: string;
  status: string;
  message: string;
}): Promise<void> {
  await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL!,
    to: params.to,
    subject: `Update on your ${params.service} — Divine Financial Group`,
    html: `
      <h2>Your ${params.service} Update</h2>
      <p><strong>Status:</strong> ${params.status}</p>
      <p>${params.message}</p>
      <p>Questions? Call <a href="tel:3023225515">(302) 322-5515</a></p>
    `,
  });
}

export async function sendMissingDocumentEmail(params: {
  to: string;
  name: string;
  service: string;
  missingItems: string[];
  uploadLink: string;
}): Promise<void> {
  await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL!,
    to: params.to,
    subject: `Action needed: Missing documents for your ${params.service}`,
    html: `
      <h2>We need a few more documents, ${params.name}</h2>
      <p>To complete your <strong>${params.service}</strong>, please upload:</p>
      <ul>${params.missingItems.map(i => `<li>${i}</li>`).join('')}</ul>
      <p><a href="${params.uploadLink}" style="background:#0B4DA2;color:white;padding:12px 24px;
         text-decoration:none;border-radius:6px;">Upload Documents Securely</a></p>
      <p>This link expires in 48 hours.</p>
    `,
  });
}

export async function sendComplianceAlertEmail(params: {
  to: string;
  businessName: string;
  alertType: string;
  dueDate: string;
  message: string;
}): Promise<void> {
  await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL!,
    to: params.to,
    subject: `⚠ Compliance Alert: ${params.alertType} — ${params.businessName}`,
    html: `
      <h2>Compliance Alert for ${params.businessName}</h2>
      <p><strong>Alert Type:</strong> ${params.alertType}</p>
      <p><strong>Due Date:</strong> ${params.dueDate}</p>
      <p>${params.message}</p>
      <p>Divine Financial Group is here to help. Call us at
         <a href="tel:3023225515">(302) 322-5515</a>.</p>
    `,
  });
}

export async function sendCallbackConfirmationEmail(params: {
  to: string;
  name: string;
  callbackTime: string;
  service: string;
}): Promise<void> {
  await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL!,
    to: params.to,
    subject: `Callback confirmed for ${params.callbackTime} — Divine Financial Group`,
    html: `
      <h2>Your callback is scheduled, ${params.name}!</h2>
      <p>A Divine Financial Group specialist will contact you at
         <strong>${params.callbackTime}</strong> regarding your <strong>${params.service}</strong>.</p>
      <p>Questions? Reply to this email or call (302) 322-5515.</p>
    `,
  });
}
```

### `temporal/src/activities/sms.activities.ts`

```typescript
import twilio from 'twilio';

const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

export async function sendStatusSMS(params: {
  to: string;
  message: string;
}): Promise<void> {
  await twilioClient.messages.create({
    body: `Divine Financial Group: ${params.message}`,
    from: process.env.TWILIO_PHONE_NUMBER,
    to: params.to,
  });
}

export async function sendMissingDocumentSMS(params: {
  to: string;
  service: string;
  uploadLink: string;
}): Promise<void> {
  await twilioClient.messages.create({
    body: `DFG: Your ${params.service} needs more docs. Upload securely: ${params.uploadLink} (48hr link)`,
    from: process.env.TWILIO_PHONE_NUMBER,
    to: params.to,
  });
}

export async function sendComplianceAlertSMS(params: {
  to: string;
  businessName: string;
  alertType: string;
  daysUntilDue: number;
}): Promise<void> {
  await twilioClient.messages.create({
    body: `DFG Alert: ${params.businessName} — ${params.alertType} due in ${params.daysUntilDue} days. Call (302) 322-5515.`,
    from: process.env.TWILIO_PHONE_NUMBER,
    to: params.to,
  });
}
```

### `temporal/src/activities/database.activities.ts`

```typescript
import { insforgeServer } from '../../lib/insforge/client';

export async function updateEnrollmentStatus(params: {
  enrollmentId: string;
  status: string;
  progress: number;
}): Promise<void> {
  await insforgeServer.database
    .from('service_enrollments')
    .update({ status: params.status, progress: params.progress, updated_at: new Date().toISOString() })
    .eq('id', params.enrollmentId);
}

export async function updateFormationStatus(params: {
  formationId: string;
  status: string;
  sosConfirmationNumber?: string;
}): Promise<void> {
  await insforgeServer.database
    .from('formations')
    .update({ filing_status: params.status, sos_confirmation_number: params.sosConfirmationNumber })
    .eq('id', params.formationId);
}

export async function updateVaultDocumentStatus(params: {
  documentId: string;
  status: string;
  virusClean?: boolean;
  storagePath?: string;
}): Promise<void> {
  await insforgeServer.database
    .from('vault_documents')
    .update({
      status: params.status,
      virus_scanned: true,
      virus_clean: params.virusClean,
      storage_path: params.storagePath,
    })
    .eq('id', params.documentId);
}

export async function writeAuditLog(params: {
  userId?: string;
  staffId?: string;
  action: string;
  resourceType?: string;
  resourceId?: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  const sensitive = ['ssn', 'ein', 'password', 'token'];
  const cleanMeta = Object.fromEntries(
    Object.entries(params.metadata || {}).map(([k, v]) =>
      sensitive.some(s => k.toLowerCase().includes(s)) ? [k, '[REDACTED]'] : [k, v]
    )
  );
  await insforgeServer.database.from('audit_logs').insert({
    ...params,
    metadata: cleanMeta,
    created_at: new Date().toISOString(),
  });
}

export async function getEnrollmentById(enrollmentId: string) {
  const { data } = await insforgeServer.database
    .from('service_enrollments')
    .select('*, user_profiles(*)')
    .eq('id', enrollmentId)
    .single();
  return data;
}

export async function queueCallback(params: {
  userId: string;
  preferredTime: string;
  preferredMethod: string;
  serviceContext: string;
  aiGatheredData: Record<string, unknown>;
}): Promise<void> {
  await insforgeServer.database.from('callback_queue').insert({
    user_id: params.userId,
    preferred_time: params.preferredTime,
    preferred_method: params.preferredMethod,
    service_context: params.serviceContext,
    ai_gathered_data: params.aiGatheredData,
    status: 'pending',
  });
}

export async function getFormationsDueForCompliance(): Promise<any[]> {
  const thirtyDaysOut = new Date();
  thirtyDaysOut.setDate(thirtyDaysOut.getDate() + 30);
  const { data } = await insforgeServer.database
    .from('formations')
    .select('*, user_profiles(legal_name, phone), service_enrollments(user_id)')
    .eq('filing_status', 'approved')
    .lte('annual_report_due', thirtyDaysOut.toISOString())
    .gte('annual_report_due', new Date().toISOString());
  return data || [];
}

export async function getExpiredLeads(): Promise<any[]> {
  const sixtyDaysAgo = new Date();
  sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
  const { data } = await insforgeServer.database
    .from('service_enrollments')
    .select('id, user_id')
    .eq('status', 'draft')
    .lte('created_at', sixtyDaysAgo.toISOString());
  return data || [];
}

export async function softDeleteEnrollment(enrollmentId: string): Promise<void> {
  await insforgeServer.database
    .from('service_enrollments')
    .update({ status: 'cancelled' })
    .eq('id', enrollmentId);
}

export async function getPendingCallbacks(): Promise<any[]> {
  const { data } = await insforgeServer.database
    .from('callback_queue')
    .select('*, user_profiles(legal_name, phone, role)')
    .eq('status', 'pending')
    .order('created_at', { ascending: true });
  return data || [];
}
```

### `temporal/src/activities/storage.activities.ts`

```typescript
import { insforgeServer } from '../../lib/insforge/client';
import crypto from 'crypto';

export async function generateUploadLink(params: {
  userId: string;
  recipientEmail: string;
  purpose: string;
  expiresInHours: number;
}): Promise<string> {
  const token = crypto.randomUUID();
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + params.expiresInHours);

  await insforgeServer.database.from('upload_links').insert({
    token,
    client_user_id: params.userId,
    recipient_email: params.recipientEmail,
    purpose: params.purpose,
    expires_at: expiresAt.toISOString(),
    is_active: true,
  });

  return `${process.env.NEXT_PUBLIC_APP_URL}/upload/${token}`;
}

export async function promoteDocumentToVault(params: {
  documentId: string;
  quarantinePath: string;
  userId: string;
  category: string;
}): Promise<string> {
  const vaultPath = `vault/${params.userId}/${params.category}/${crypto.randomUUID()}`;
  // Move file from quarantine bucket to vault bucket via InsForge Storage
  await insforgeServer.storage
    .from('dfg-vault')
    .copy(params.quarantinePath, vaultPath);
  await insforgeServer.storage
    .from('dfg-quarantine')
    .remove([params.quarantinePath]);
  return vaultPath;
}

export async function simulateMalwareScan(documentId: string): Promise<boolean> {
  // In production: call your virus scanning API (ClamAV, Cloudmersive, etc.)
  // For now: always returns clean, with a realistic delay
  await new Promise(resolve => setTimeout(resolve, 1500));
  return true; // clean
}
```

### `temporal/src/activities/payment.activities.ts`

```typescript
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function createStripePaymentLink(params: {
  service: string;
  amount: number; // in cents
  userId: string;
  enrollmentId: string;
  description: string;
}): Promise<string> {
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: [{
      price_data: {
        currency: 'usd',
        product_data: { name: `Divine Financial Group — ${params.service}`, description: params.description },
        unit_amount: params.amount,
      },
      quantity: 1,
    }],
    mode: 'payment',
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/portal/dashboard?payment=success&enrollment=${params.enrollmentId}`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/portal/dashboard?payment=cancelled`,
    metadata: { userId: params.userId, enrollmentId: params.enrollmentId, service: params.service },
  });
  return session.url!;
}
```

---

## PART 4: ALL WORKFLOW DEFINITIONS

### 4A. Business Formation Workflow

```typescript
// temporal/src/workflows/formation.workflow.ts
import { proxyActivities, sleep, defineSignal, setHandler } from '@temporalio/workflow';
import type * as emailActs from '../activities/email.activities';
import type * as dbActs    from '../activities/database.activities';
import type * as storageActs from '../activities/storage.activities';
import type * as paymentActs from '../activities/payment.activities';

const email   = proxyActivities<typeof emailActs>({ startToCloseTimeout: '30s' });
const db      = proxyActivities<typeof dbActs>({ startToCloseTimeout: '30s' });
const storage = proxyActivities<typeof storageActs>({ startToCloseTimeout: '30s' });
const payment = proxyActivities<typeof paymentActs>({ startToCloseTimeout: '60s' });

// Signals — allow the UI to communicate into a running workflow
export const documentsUploadedSignal = defineSignal<[string[]]>('documentsUploaded');
export const paymentCompletedSignal  = defineSignal<[string]>('paymentCompleted');
export const staffApprovedSignal     = defineSignal<[string]>('staffApproved');

export async function businessFormationWorkflow(params: {
  enrollmentId: string;
  userId: string;
  clientEmail: string;
  clientName: string;
  clientPhone: string;
  businessName: string;
  entityType: string;
  state: string;
  useDivineAgent: boolean;
  intakeData: Record<string, unknown>;
}): Promise<void> {

  // Step 1 — Confirm receipt
  await db.updateEnrollmentStatus({ enrollmentId: params.enrollmentId, status: 'pending', progress: 10 });
  await db.writeAuditLog({ userId: params.userId, action: 'formation_workflow_started', resourceType: 'enrollment', resourceId: params.enrollmentId });
  await email.sendWelcomeEmail({ to: params.clientEmail, name: params.clientName, service: 'Business Formation' });
  await email.sendStaffNotificationEmail({ service: 'Business Formation', clientName: params.clientName, clientEmail: params.clientEmail, pod: 'Legal Pod', enrollmentId: params.enrollmentId, intakeSummary: params.intakeData });

  // Step 2 — Request any missing documents
  await db.updateEnrollmentStatus({ enrollmentId: params.enrollmentId, status: 'active', progress: 25 });
  const uploadLink = await storage.generateUploadLink({ userId: params.userId, recipientEmail: params.clientEmail, purpose: 'Business Formation — ID and Owner Documents', expiresInHours: 48 });
  await email.sendMissingDocumentEmail({ to: params.clientEmail, name: params.clientName, service: 'Business Formation', missingItems: ['Government-issued Photo ID for each owner', 'Signed Operating Agreement (if available)'], uploadLink });

  // Step 3 — Wait for documents (up to 7 days) OR staff approval signal
  let documentsReceived = false;
  let staffApproved = false;
  setHandler(documentsUploadedSignal, () => { documentsReceived = true; });
  setHandler(staffApprovedSignal, () => { staffApproved = true; });

  // Poll every 6 hours for up to 7 days
  for (let i = 0; i < 28; i++) {
    await sleep('6h');
    if (documentsReceived || staffApproved) break;
  }

  // Step 4 — Generate payment link for the formation fee
  await db.updateEnrollmentStatus({ enrollmentId: params.enrollmentId, status: 'active', progress: 50 });
  const paymentUrl = await payment.createStripePaymentLink({ service: 'Business Formation', amount: 29900, userId: params.userId, enrollmentId: params.enrollmentId, description: `${params.entityType} formation in ${params.state}` });
  await email.sendStatusUpdateEmail({ to: params.clientEmail, name: params.clientName, service: 'Business Formation', status: 'Ready for Payment', message: `Your ${params.entityType} in ${params.state} is ready to be filed. Please complete payment to proceed: ${paymentUrl}` });

  // Step 5 — Wait for payment (up to 3 days)
  let paymentCompleted = false;
  setHandler(paymentCompletedSignal, () => { paymentCompleted = true; });
  for (let i = 0; i < 72; i++) {
    await sleep('1h');
    if (paymentCompleted) break;
  }

  // Step 6 — File with state (manual fulfillment for MVP, automated later)
  await db.updateEnrollmentStatus({ enrollmentId: params.enrollmentId, status: 'active', progress: 75 });
  await email.sendStatusUpdateEmail({ to: params.clientEmail, name: params.clientName, service: 'Business Formation', status: 'Filed with State', message: `Your ${params.entityType} has been submitted to the ${params.state} Secretary of State. Typical processing time is 5–10 business days.` });

  // Step 7 — Wait for state approval (up to 15 business days = ~21 calendar days)
  await sleep('21d');

  // Step 8 — Complete
  await db.updateFormationStatus({ formationId: params.enrollmentId, status: 'approved' });
  await db.updateEnrollmentStatus({ enrollmentId: params.enrollmentId, status: 'completed', progress: 100 });
  await email.sendStatusUpdateEmail({ to: params.clientEmail, name: params.clientName, service: 'Business Formation', status: '✅ Approved!', message: `Congratulations! Your ${params.businessName} ${params.entityType} has been officially approved by the state. Your Articles of Organization and EIN confirmation are in your secure vault.` });
  await db.writeAuditLog({ userId: params.userId, action: 'formation_workflow_completed', resourceType: 'enrollment', resourceId: params.enrollmentId });
}
```

### 4B. Tax Preparation Workflow

```typescript
// temporal/src/workflows/tax.workflow.ts
import { proxyActivities, sleep, defineSignal, setHandler } from '@temporalio/workflow';
import type * as emailActs from '../activities/email.activities';
import type * as dbActs    from '../activities/database.activities';
import type * as storageActs from '../activities/storage.activities';
import type * as paymentActs from '../activities/payment.activities';

const email   = proxyActivities<typeof emailActs>({ startToCloseTimeout: '30s' });
const db      = proxyActivities<typeof dbActs>({ startToCloseTimeout: '30s' });
const storage = proxyActivities<typeof storageActs>({ startToCloseTimeout: '30s' });
const payment = proxyActivities<typeof paymentActs>({ startToCloseTimeout: '60s' });

export const documentsUploadedSignal = defineSignal<[string[]]>('documentsUploaded');
export const reviewCompleteSignal    = defineSignal<[void]>('reviewComplete');
export const clientApprovedSignal    = defineSignal<[void]>('clientApproved');

export async function taxPreparationWorkflow(params: {
  enrollmentId: string;
  userId: string;
  clientEmail: string;
  clientName: string;
  filingStatus: string;
  incomeSources: string[];
  deductions: string[];
}): Promise<void> {

  await db.updateEnrollmentStatus({ enrollmentId: params.enrollmentId, status: 'pending', progress: 10 });
  await email.sendWelcomeEmail({ to: params.clientEmail, name: params.clientName, service: 'Tax Preparation' });
  await email.sendStaffNotificationEmail({ service: 'Tax Preparation', clientName: params.clientName, clientEmail: params.clientEmail, pod: 'Tax Pod', enrollmentId: params.enrollmentId, intakeSummary: { filingStatus: params.filingStatus, incomeSources: params.incomeSources, deductions: params.deductions } });

  // Request specific documents based on income sources
  const requiredDocs: string[] = [];
  if (params.incomeSources.includes('W-2 (Employee)')) requiredDocs.push('W-2 form(s) from all employers');
  if (params.incomeSources.includes('1099 / Freelance')) requiredDocs.push('All 1099 forms received');
  if (params.incomeSources.includes('Rental Income')) requiredDocs.push('Schedule E documentation and rental receipts');
  if (params.incomeSources.includes('Stocks / Crypto')) requiredDocs.push('1099-B or crypto transaction history');
  if (params.deductions.includes('Bought a Home')) requiredDocs.push('Form 1098 (Mortgage Interest Statement)');
  requiredDocs.push('Prior year tax return (2024)', 'Government-issued Photo ID', 'Social Security cards for all dependents');

  const uploadLink = await storage.generateUploadLink({ userId: params.userId, recipientEmail: params.clientEmail, purpose: 'Tax Documents Upload', expiresInHours: 72 });
  await email.sendMissingDocumentEmail({ to: params.clientEmail, name: params.clientName, service: 'Tax Preparation', missingItems: requiredDocs, uploadLink });
  await db.updateEnrollmentStatus({ enrollmentId: params.enrollmentId, status: 'active', progress: 25 });

  // Wait for document upload (up to 14 days)
  let docsUploaded = false;
  setHandler(documentsUploadedSignal, () => { docsUploaded = true; });
  for (let i = 0; i < 56; i++) { // 14 days in 6-hour polls
    await sleep('6h');
    if (docsUploaded) break;
  }

  // Preparation phase (staff working on return)
  await db.updateEnrollmentStatus({ enrollmentId: params.enrollmentId, status: 'active', progress: 60 });
  await email.sendStatusUpdateEmail({ to: params.clientEmail, name: params.clientName, service: 'Tax Preparation', status: 'In Preparation', message: 'Your documents have been received and your tax return is now being prepared by your assigned Divine Financial Group preparer. You will receive a review copy within 3–5 business days.' });

  // Wait for staff to mark review complete
  let reviewDone = false;
  setHandler(reviewCompleteSignal, () => { reviewDone = true; });
  for (let i = 0; i < 40; i++) { await sleep('6h'); if (reviewDone) break; }

  // Send draft to client for approval
  await db.updateEnrollmentStatus({ enrollmentId: params.enrollmentId, status: 'active', progress: 80 });
  await email.sendStatusUpdateEmail({ to: params.clientEmail, name: params.clientName, service: 'Tax Preparation', status: 'Ready for Review', message: 'Your tax return draft is ready for your review in the Divine portal. Please log in, review the return, and approve it for filing.' });

  // Wait for client approval
  let clientOk = false;
  setHandler(clientApprovedSignal, () => { clientOk = true; });
  for (let i = 0; i < 28; i++) { await sleep('6h'); if (clientOk) break; }

  // File and complete
  await db.updateEnrollmentStatus({ enrollmentId: params.enrollmentId, status: 'completed', progress: 100 });
  await email.sendStatusUpdateEmail({ to: params.clientEmail, name: params.clientName, service: 'Tax Preparation', status: '✅ Filed!', message: 'Your tax return has been electronically filed with the IRS. Your confirmation and copies are in your secure vault. Thank you for choosing Divine Financial Group!' });
  await db.writeAuditLog({ userId: params.userId, action: 'tax_workflow_completed', resourceType: 'enrollment', resourceId: params.enrollmentId });
}
```

### 4C. Vault Document Pipeline Workflow

```typescript
// temporal/src/workflows/vault.workflow.ts
import { proxyActivities } from '@temporalio/workflow';
import type * as dbActs      from '../activities/database.activities';
import type * as storageActs from '../activities/storage.activities';
import type * as emailActs   from '../activities/email.activities';

const db      = proxyActivities<typeof dbActs>({ startToCloseTimeout: '30s' });
const storage = proxyActivities<typeof storageActs>({ startToCloseTimeout: '60s' });
const email   = proxyActivities<typeof emailActs>({ startToCloseTimeout: '30s' });

export async function documentVaultPipelineWorkflow(params: {
  documentId: string;
  userId: string;
  quarantinePath: string;
  category: string;
  staffEmail: string;
  displayName: string;
}): Promise<void> {

  // Step 1 — Mark as scanning
  await db.updateVaultDocumentStatus({ documentId: params.documentId, status: 'scanning' });

  // Step 2 — Run malware scan
  const isClean = await storage.simulateMalwareScan(params.documentId);

  if (!isClean) {
    await db.updateVaultDocumentStatus({ documentId: params.documentId, status: 'flagged', virusClean: false });
    await email.sendStaffNotificationEmail({ service: 'Vault Security', clientName: 'SYSTEM', clientEmail: params.staffEmail, pod: 'Security', enrollmentId: params.documentId, intakeSummary: { alert: 'MALWARE_DETECTED', documentId: params.documentId, file: params.displayName } });
    await db.writeAuditLog({ userId: params.userId, action: 'vault_document_flagged_malware', resourceType: 'document', resourceId: params.documentId });
    return; // Stop workflow — do not promote to vault
  }

  // Step 3 — Promote clean file to permanent vault
  const vaultPath = await storage.promoteDocumentToVault({ documentId: params.documentId, quarantinePath: params.quarantinePath, userId: params.userId, category: params.category });

  // Step 4 — Mark as clean in database
  await db.updateVaultDocumentStatus({ documentId: params.documentId, status: 'clean', virusClean: true, storagePath: vaultPath });
  await db.writeAuditLog({ userId: params.userId, action: 'vault_document_promoted', resourceType: 'document', resourceId: params.documentId, metadata: { category: params.category, vaultPath } });
}
```

### 4D. Auto Insurance Workflow

```typescript
// temporal/src/workflows/insurance.workflow.ts
import { proxyActivities, sleep, defineSignal, setHandler } from '@temporalio/workflow';
import type * as emailActs   from '../activities/email.activities';
import type * as smsActs     from '../activities/sms.activities';
import type * as dbActs      from '../activities/database.activities';
import type * as storageActs from '../activities/storage.activities';

const email   = proxyActivities<typeof emailActs>({ startToCloseTimeout: '30s' });
const sms     = proxyActivities<typeof smsActs>({ startToCloseTimeout: '30s' });
const db      = proxyActivities<typeof dbActs>({ startToCloseTimeout: '30s' });
const storage = proxyActivities<typeof storageActs>({ startToCloseTimeout: '30s' });

export const quoteSelectedSignal  = defineSignal<[string]>('quoteSelected');
export const policyBoundSignal    = defineSignal<[void]>('policyBound');

export async function autoInsuranceWorkflow(params: {
  enrollmentId: string;
  userId: string;
  clientEmail: string;
  clientName: string;
  clientPhone: string;
  zipCode: string;
  vehicleUsage: string;
  driverHistory: string;
}): Promise<void> {

  await db.updateEnrollmentStatus({ enrollmentId: params.enrollmentId, status: 'pending', progress: 10 });
  await email.sendWelcomeEmail({ to: params.clientEmail, name: params.clientName, service: 'Auto Insurance' });
  await email.sendStaffNotificationEmail({ service: 'Auto Insurance', clientName: params.clientName, clientEmail: params.clientEmail, pod: 'Insurance Pod', enrollmentId: params.enrollmentId, intakeSummary: { zipCode: params.zipCode, vehicleUsage: params.vehicleUsage, driverHistory: params.driverHistory } });

  // Request documents
  const uploadLink = await storage.generateUploadLink({ userId: params.userId, recipientEmail: params.clientEmail, purpose: 'Auto Insurance — Driver License and Current Policy', expiresInHours: 48 });
  await email.sendMissingDocumentEmail({ to: params.clientEmail, name: params.clientName, service: 'Auto Insurance', missingItems: ["Valid Driver's License", 'Current auto insurance declaration page (if insured)', 'Vehicle registration'], uploadLink });
  await db.updateEnrollmentStatus({ enrollmentId: params.enrollmentId, status: 'active', progress: 30 });

  // Broker prepares quotes (notify them)
  await email.sendStatusUpdateEmail({ to: params.clientEmail, name: params.clientName, service: 'Auto Insurance', status: 'Quotes Being Prepared', message: 'Our licensed broker is preparing competitive quotes from multiple carriers for your ZIP code. You will receive your quote comparison within 1 business day.' });

  // Wait for quote selection (up to 7 days)
  let selectedCarrier = '';
  setHandler(quoteSelectedSignal, (carrier) => { selectedCarrier = carrier; });
  for (let i = 0; i < 28; i++) { await sleep('6h'); if (selectedCarrier) break; }
  await db.updateEnrollmentStatus({ enrollmentId: params.enrollmentId, status: 'active', progress: 70 });

  // Wait for policy binding
  let policyBound = false;
  setHandler(policyBoundSignal, () => { policyBound = true; });
  for (let i = 0; i < 20; i++) { await sleep('6h'); if (policyBound) break; }

  await db.updateEnrollmentStatus({ enrollmentId: params.enrollmentId, status: 'completed', progress: 100 });
  await email.sendStatusUpdateEmail({ to: params.clientEmail, name: params.clientName, service: 'Auto Insurance', status: '✅ Policy Active!', message: `Your auto insurance policy with ${selectedCarrier} is now active. Your policy documents are in your secure vault.` });
  if (params.clientPhone) {
    await sms.sendStatusSMS({ to: params.clientPhone, message: `Your auto insurance policy is active! Check your secure vault for documents.` });
  }
  await db.writeAuditLog({ userId: params.userId, action: 'insurance_workflow_completed', resourceType: 'enrollment', resourceId: params.enrollmentId });
}
```

### 4E. Notary Services Workflow

```typescript
// temporal/src/workflows/notary.workflow.ts
import { proxyActivities, sleep, defineSignal, setHandler } from '@temporalio/workflow';
import type * as emailActs from '../activities/email.activities';
import type * as dbActs    from '../activities/database.activities';
import type * as storageActs from '../activities/storage.activities';

const email   = proxyActivities<typeof emailActs>({ startToCloseTimeout: '30s' });
const db      = proxyActivities<typeof dbActs>({ startToCloseTimeout: '30s' });
const storage = proxyActivities<typeof storageActs>({ startToCloseTimeout: '30s' });

export const kycVerifiedSignal      = defineSignal<[void]>('kycVerified');
export const sessionCompletedSignal = defineSignal<[void]>('sessionCompleted');

export async function notaryServicesWorkflow(params: {
  enrollmentId: string;
  userId: string;
  clientEmail: string;
  clientName: string;
  documentType: string;
  signerCount: number;
  scheduledTime: string;
}): Promise<void> {

  await db.updateEnrollmentStatus({ enrollmentId: params.enrollmentId, status: 'pending', progress: 10 });
  await email.sendWelcomeEmail({ to: params.clientEmail, name: params.clientName, service: 'Notary Services' });
  await email.sendStaffNotificationEmail({ service: 'Notary Services', clientName: params.clientName, clientEmail: params.clientEmail, pod: 'Notary Pod', enrollmentId: params.enrollmentId, intakeSummary: { documentType: params.documentType, signerCount: params.signerCount, scheduledTime: params.scheduledTime } });

  // Request document upload before session
  const uploadLink = await storage.generateUploadLink({ userId: params.userId, recipientEmail: params.clientEmail, purpose: `Notary — ${params.documentType} upload`, expiresInHours: 24 });
  await email.sendMissingDocumentEmail({ to: params.clientEmail, name: params.clientName, service: 'Notary Services', missingItems: [`${params.documentType} to be notarized`, 'Government-issued Photo ID (for each signer)'], uploadLink });

  await email.sendStatusUpdateEmail({ to: params.clientEmail, name: params.clientName, service: 'Notary Services', status: 'Session Scheduled', message: `Your Remote Online Notary session is scheduled for ${params.scheduledTime}. Please have your photo ID and document ready. A video link will be sent 30 minutes before your session.` });
  await db.updateEnrollmentStatus({ enrollmentId: params.enrollmentId, status: 'active', progress: 40 });

  // Wait for KYC verification (must happen before session)
  let kycDone = false;
  setHandler(kycVerifiedSignal, () => { kycDone = true; });
  for (let i = 0; i < 48; i++) { await sleep('30m'); if (kycDone) break; }

  await db.updateEnrollmentStatus({ enrollmentId: params.enrollmentId, status: 'active', progress: 70 });

  // Wait for session completion signal from notary staff
  let sessionDone = false;
  setHandler(sessionCompletedSignal, () => { sessionDone = true; });
  for (let i = 0; i < 96; i++) { await sleep('30m'); if (sessionDone) break; }

  await db.updateEnrollmentStatus({ enrollmentId: params.enrollmentId, status: 'completed', progress: 100 });
  await email.sendStatusUpdateEmail({ to: params.clientEmail, name: params.clientName, service: 'Notary Services', status: '✅ Notarized!', message: 'Your document has been successfully notarized. The signed document and session recording are available in your secure vault per state law requirements.' });
  await db.writeAuditLog({ userId: params.userId, action: 'notary_workflow_completed', resourceType: 'enrollment', resourceId: params.enrollmentId, metadata: { documentType: params.documentType, signerCount: params.signerCount } });
}
```

### 4F. Bookkeeping Onboarding Workflow

```typescript
// temporal/src/workflows/bookkeeping.workflow.ts
import { proxyActivities, sleep, defineSignal, setHandler } from '@temporalio/workflow';
import type * as emailActs   from '../activities/email.activities';
import type * as dbActs      from '../activities/database.activities';
import type * as storageActs from '../activities/storage.activities';

const email   = proxyActivities<typeof emailActs>({ startToCloseTimeout: '30s' });
const db      = proxyActivities<typeof dbActs>({ startToCloseTimeout: '30s' });
const storage = proxyActivities<typeof storageActs>({ startToCloseTimeout: '30s' });

export const bankConnectedSignal    = defineSignal<[void]>('bankConnected');
export const setupCompleteSignal    = defineSignal<[void]>('setupComplete');

export async function bookkeepingOnboardingWorkflow(params: {
  enrollmentId: string;
  userId: string;
  clientEmail: string;
  clientName: string;
  businessStage: string;
  transactionVolume: string;
  currentTools: string;
  reportingGoal: string;
}): Promise<void> {

  await db.updateEnrollmentStatus({ enrollmentId: params.enrollmentId, status: 'pending', progress: 10 });
  await email.sendWelcomeEmail({ to: params.clientEmail, name: params.clientName, service: 'Bookkeeping' });
  await email.sendStaffNotificationEmail({ service: 'Bookkeeping', clientName: params.clientName, clientEmail: params.clientEmail, pod: 'Finance Pod', enrollmentId: params.enrollmentId, intakeSummary: { businessStage: params.businessStage, transactionVolume: params.transactionVolume, currentTools: params.currentTools, reportingGoal: params.reportingGoal } });

  // Request initial documents
  const uploadLink = await storage.generateUploadLink({ userId: params.userId, recipientEmail: params.clientEmail, purpose: 'Bookkeeping Onboarding — Bank Statements', expiresInHours: 72 });
  const docsNeeded = ['Last 3 months of bank statements', 'Last 3 months of credit card statements'];
  if (params.currentTools !== 'Nothing yet') docsNeeded.push(`Export from ${params.currentTools} (last 12 months)`);
  await email.sendMissingDocumentEmail({ to: params.clientEmail, name: params.clientName, service: 'Bookkeeping', missingItems: docsNeeded, uploadLink });
  await db.updateEnrollmentStatus({ enrollmentId: params.enrollmentId, status: 'active', progress: 25 });

  // Wait for bank connection or document upload
  let bankConnected = false;
  setHandler(bankConnectedSignal, () => { bankConnected = true; });
  for (let i = 0; i < 28; i++) { await sleep('6h'); if (bankConnected) break; }

  await email.sendStatusUpdateEmail({ to: params.clientEmail, name: params.clientName, service: 'Bookkeeping', status: 'Chart of Accounts Setup', message: 'Your bookkeeper is setting up your Chart of Accounts and categorizing your initial transactions. You will receive a first monthly report within 5 business days.' });
  await db.updateEnrollmentStatus({ enrollmentId: params.enrollmentId, status: 'active', progress: 60 });

  // Wait for setup complete from staff
  let setupDone = false;
  setHandler(setupCompleteSignal, () => { setupDone = true; });
  for (let i = 0; i < 40; i++) { await sleep('6h'); if (setupDone) break; }

  await db.updateEnrollmentStatus({ enrollmentId: params.enrollmentId, status: 'completed', progress: 100 });
  await email.sendStatusUpdateEmail({ to: params.clientEmail, name: params.clientName, service: 'Bookkeeping', status: '✅ Bookkeeping Active!', message: 'Your books are set up and running! You will receive monthly reports in your secure vault. Your bookkeeper will reach out monthly to review.' });
  await db.writeAuditLog({ userId: params.userId, action: 'bookkeeping_workflow_completed', resourceType: 'enrollment', resourceId: params.enrollmentId });
}
```

### 4G. Scheduled Workflows

```typescript
// temporal/src/workflows/scheduled/retention.workflow.ts
import { proxyActivities } from '@temporalio/workflow';
import type * as dbActs from '../../activities/database.activities';
const db = proxyActivities<typeof dbActs>({ startToCloseTimeout: '2m' });

// Runs daily at 2 AM — deletes leads that never converted (GLBA compliance)
export async function dataRetentionCleanupWorkflow(): Promise<void> {
  const expiredLeads = await db.getExpiredLeads();
  for (const lead of expiredLeads) {
    await db.softDeleteEnrollment(lead.id);
    await db.writeAuditLog({ action: 'data_retention_auto_delete', resourceType: 'enrollment', resourceId: lead.id, metadata: { reason: 'GLBA_60_DAY_RETENTION', userId: lead.user_id } });
  }
}

// temporal/src/workflows/scheduled/compliance.workflow.ts
import { proxyActivities } from '@temporalio/workflow';
import type * as dbActs    from '../../activities/database.activities';
import type * as emailActs from '../../activities/email.activities';
import type * as smsActs   from '../../activities/sms.activities';
const db    = proxyActivities<typeof dbActs>({ startToCloseTimeout: '2m' });
const email = proxyActivities<typeof emailActs>({ startToCloseTimeout: '30s' });
const sms   = proxyActivities<typeof smsActs>({ startToCloseTimeout: '30s' });

// Runs daily — checks for annual report deadlines within 30 days
export async function annualReportComplianceWorkflow(): Promise<void> {
  const formations = await db.getFormationsDueForCompliance();
  for (const f of formations) {
    const daysOut = Math.floor((new Date(f.annual_report_due).getTime() - Date.now()) / 86400000);
    const clientEmail = f.user_profiles?.email || '';
    const clientPhone = f.user_profiles?.phone || '';
    await email.sendComplianceAlertEmail({ to: clientEmail, businessName: f.business_name, alertType: 'Annual Report Due', dueDate: new Date(f.annual_report_due).toLocaleDateString('en-US'), message: `Your ${f.business_name} annual report is due in ${daysOut} days. Divine Financial Group can file this for you. Call (302) 322-5515 or log into your portal to get started.` });
    if (clientPhone && daysOut <= 7) {
      await sms.sendComplianceAlertSMS({ to: clientPhone, businessName: f.business_name, alertType: 'Annual Report', daysUntilDue: daysOut });
    }
    await db.writeAuditLog({ action: 'compliance_alert_sent', resourceType: 'formation', resourceId: f.id, metadata: { alertType: 'annual_report', daysOut } });
  }
}

// temporal/src/workflows/scheduled/digest.workflow.ts
import { proxyActivities } from '@temporalio/workflow';
import type * as dbActs    from '../../activities/database.activities';
import type * as emailActs from '../../activities/email.activities';
const db    = proxyActivities<typeof dbActs>({ startToCloseTimeout: '2m' });
const email = proxyActivities<typeof emailActs>({ startToCloseTimeout: '30s' });

// Runs weekday mornings at 9 AM ET — sends staff their overnight activity summary
export async function morningDigestWorkflow(): Promise<void> {
  const callbacks = await db.getPendingCallbacks();
  if (callbacks.length === 0) return;
  await email.sendStaffNotificationEmail({ service: 'Morning Digest', clientName: 'SYSTEM DIGEST', clientEmail: process.env.RESEND_REPLY_TO || 'info@dfgbusiness.com', pod: 'All Pods', enrollmentId: 'system', intakeSummary: { pendingCallbacks: callbacks.length, callbackList: callbacks.map(c => ({ name: c.user_profiles?.legal_name, time: c.preferred_time, service: c.service_context, method: c.preferred_method })) } });
}
```

---

## PART 5: REGISTER SCHEDULED WORKFLOWS

Create `temporal/src/schedules.ts` — run once to register all cron schedules:

```typescript
import { getTemporalClient, TASK_QUEUES } from './client';
import { ScheduleOverlapPolicy } from '@temporalio/client';

async function registerSchedules() {
  const client = await getTemporalClient();

  // Data Retention — daily at 2 AM ET
  await client.schedule.create({
    scheduleId: 'dfg-data-retention-cleanup',
    spec: { cronExpressions: ['0 7 * * *'] }, // 7 UTC = 2 AM ET
    action: {
      type: 'startWorkflow',
      workflowType: 'dataRetentionCleanupWorkflow',
      taskQueue: TASK_QUEUES.SCHEDULED,
    },
    policies: { overlap: ScheduleOverlapPolicy.SKIP },
  });

  // Annual Report Compliance — daily at 8 AM ET
  await client.schedule.create({
    scheduleId: 'dfg-compliance-alerts',
    spec: { cronExpressions: ['0 13 * * *'] }, // 13 UTC = 8 AM ET
    action: {
      type: 'startWorkflow',
      workflowType: 'annualReportComplianceWorkflow',
      taskQueue: TASK_QUEUES.SCHEDULED,
    },
    policies: { overlap: ScheduleOverlapPolicy.SKIP },
  });

  // Morning Digest — weekdays at 9 AM ET
  await client.schedule.create({
    scheduleId: 'dfg-morning-digest',
    spec: { cronExpressions: ['0 14 * * 1-5'] }, // 14 UTC = 9 AM ET Mon-Fri
    action: {
      type: 'startWorkflow',
      workflowType: 'morningDigestWorkflow',
      taskQueue: TASK_QUEUES.SCHEDULED,
    },
    policies: { overlap: ScheduleOverlapPolicy.SKIP },
  });

  console.log('✅ All Temporal schedules registered');
}

registerSchedules().catch(console.error);
```

Run once after Worker is started:

```bash
npx ts-node temporal/src/schedules.ts
```

---

## PART 6: NEXT.JS API ROUTES — TRIGGER TEMPORAL WORKFLOWS

Every intake wizard submit button calls one of these API routes, which
starts the appropriate Temporal Workflow:

### `app/api/workflows/formation/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getTemporalClient, TASK_QUEUES } from '../../../../temporal/src/client';

export async function POST(request: NextRequest) {
  const body = await request.json();
  const client = await getTemporalClient();

  const handle = await client.workflow.start('businessFormationWorkflow', {
    taskQueue: TASK_QUEUES.FORMATION,
    workflowId: `formation-${body.enrollmentId}`,
    args: [body],
  });

  return NextResponse.json({ workflowId: handle.workflowId }, { status: 201 });
}

// Signal endpoint — send signals INTO a running workflow
export async function PATCH(request: NextRequest) {
  const { workflowId, signal, payload } = await request.json();
  const client = await getTemporalClient();
  const handle = client.workflow.getHandle(workflowId);
  await handle.signal(signal, payload);
  return NextResponse.json({ ok: true });
}
```

Create identical route files for:
- `app/api/workflows/tax/route.ts` → `taxPreparationWorkflow`
- `app/api/workflows/insurance/route.ts` → `autoInsuranceWorkflow`
- `app/api/workflows/notary/route.ts` → `notaryServicesWorkflow`
- `app/api/workflows/bookkeeping/route.ts` → `bookkeepingOnboardingWorkflow`
- `app/api/workflows/vault/route.ts` → `documentVaultPipelineWorkflow`

### `app/api/workflows/status/[workflowId]/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getTemporalClient } from '../../../../../temporal/src/client';

export async function GET(request: NextRequest, { params }: { params: { workflowId: string } }) {
  const client = await getTemporalClient();
  const handle = client.workflow.getHandle(params.workflowId);
  const desc = await handle.describe();
  return NextResponse.json({
    status: desc.status.name,
    workflowId: desc.workflowId,
    startTime: desc.startTime,
  });
}
```

---

## PART 7: BUILD ALL PLATFORM MODULES — COMPLETE FEATURE LIST

Now build every UI module of the platform, wired to InsForge and Temporal:

### 7A. Public Website — All 4 Pages (Complete)

**HOME** (`app/page.tsx`):
- Sticky nav: Logo + Home/About/Services/Contact links + "Client Portal" button
- Hero: blue gradient, "Your Trusted Partner in Financial Success" H1,
  real contact info (302) 322-5515 | info@dfgbusiness.com, 2 CTA buttons,
  animated service preview card showing 5 services with progress bars
- Stats: 25+ Years | 2,400+ Clients | 5 Services | AES-256 Security
- Services preview: all 5 service cards with real descriptions and bullet lists
- Why Choose Us: 4 reason cards + blue CTA banner
- Testimonials: 3 real client quotes (see original content prompt)
- Footer: 4-column dark footer with all contact info and social links

**ABOUT** (`app/about/page.tsx`):
- Blue hero with mission statement
- Origin story (full 2000/Allstates Accounting Services history)
- 25+ years stat card + 4 metric cards
- Core Values: Integrity | Excellence | Client-Centric | Accessibility
- Why Partner section with 3 checkmark items

**SERVICES** (`app/services/page.tsx`):
- Blue hero
- 5 numbered service cards (01–05) with colored left border,
  full descriptions and all bullet points from the content spec

**CONTACT** (`app/contact/page.tsx`):
- Blue hero
- Contact form (Name, Email, Phone, Service dropdown, Message)
- On submit → POST to `/api/contact` → saves to InsForge `contact_submissions` table
  AND sends email to info@dfgbusiness.com via Resend
- Contact info sidebar: full address, all phone numbers (main, fax, text, WhatsApp)
- Business hours (Mon–Fri 9–5, Sat 10–2 tax season, Sun closed)
- Social media links (Facebook, X/Twitter, Instagram)

### 7B. Authentication Pages

**LOGIN** (`app/login/page.tsx`):
- DFG branded login form
- Email + password fields
- "Forgot password?" link
- "Don't have an account? Sign up" link
- On submit → `insforge.auth.signInWithPassword()` → redirect to `/portal/dashboard`
- Error handling: show inline errors, not alerts

**SIGNUP** (`app/signup/page.tsx`):
- Full name, email, password, confirm password
- "Already have an account? Log in" link
- On submit → `insforge.auth.signUp()` → show "Check your email" confirmation
- Create `user_profiles` record after successful auth signup

**`app/upload/[token]/page.tsx`** (public upload page):
- Validates token against `upload_links` table
- If expired/invalid → show "This link has expired" message
- If valid → show branded DFG upload zone
- On file drop → upload to InsForge Storage quarantine bucket
- Trigger `/api/workflows/vault` to start the vault pipeline workflow
- Show confirmation: "Files uploaded securely. Divine Financial Group will review them shortly."

### 7C. Client Portal — All 5 Modules

**PORTAL LAYOUT** (`app/portal/layout.tsx`):
- Auth guard: if no InsForge session → redirect to `/login`
- Desktop: left sidebar (220px) with 5 nav items + security badge + health score
- Mobile: bottom tab bar (64px fixed) with 5 icon tabs
- Portal topbar: compact logo + universal search + "Close Portal" link + user avatar

**DASHBOARD** (`app/portal/dashboard/page.tsx`):
- Fetch real data from InsForge:
  - Health score = calculated from all enrollment progress values
  - Service cards = `service_enrollments` for current user
  - Needs attention = enrollments with `status='pending'` OR `progress < 30`
- Quick action buttons wired to correct portal sections
- All service cards clickable → navigate to that service's intake tab

**INTAKE WIZARDS** (`app/portal/intake/page.tsx`):
- Service selector tabs (all 5 services)
- For each service: full multi-step form as specified in the master build prompt
- On final submit:
  1. UPDATE `service_enrollments` to `status='pending'`, `progress=100`
  2. POST to appropriate `/api/workflows/[service]` route
  3. This starts the Temporal workflow in the background
  4. Show success screen with workflow ID
- Cross-sell suggestions sidebar changes per active service
- Sticky "Continue" button on mobile (fixed to bottom)
- Save progress to localStorage on each step

**SECURE VAULT** (`app/portal/vault/page.tsx`):
- File list fetched from InsForge `vault_documents` for current user
- Upload zone → triggers vault pipeline workflow (quarantine → scan → promote)
- Generate upload link → creates `upload_links` record, returns share URL
- Real-time status updates using InsForge Realtime subscriptions
- Quarantine pipeline visualizer (shows actual document status from DB)
- Audit log fetched from `audit_logs` for current user's documents
- Full file table with category, status, routed-to, and view action

**AI CHAT** (`app/portal/chat/page.tsx`):
- Chat sessions saved to InsForge `chat_sessions` + `chat_messages` tables
- Quick reply chips: all 5 services + "Human Agent"
- AI responses: keyword-based intent detection
- On "Human Agent" → UPDATE `chat_sessions.status = 'waiting_human'`
  + notify staff via Resend email
- Off-hours detection (after 6 PM ET or weekends):
  → INSERT into `callback_queue` via Temporal workflow trigger
  → Show callback scheduling UI
- All messages persisted — user can see history on return visit
- Business hours + contact info sidebar with real DFG numbers

**STAFF ADMIN** (`app/portal/admin/page.tsx`):
- Route guard: check `user_profiles.role !== 'client'`
- Manager guard for audit tab: `role === 'manager'`
- Queue tab: fetch `service_enrollments` with `status='pending'` + user details
- Override modal: clicking "Open Case" writes to `audit_logs` first
- Permissions tab: display RBAC matrix (static reference, all 7 roles)
- Audit log tab: fetch from `audit_logs` (manager only), paginated
- Send signal to Temporal workflow: "Staff Approved" button sends signal
  to the running workflow for that client's enrollment
- Stats cards: real counts from InsForge DB queries
- Staff can send missing-document requests → triggers Temporal Activity

### 7D. Workflow Status Component

Create a reusable `<WorkflowStatus workflowId={id} />` component that:
- Polls `/api/workflows/status/[workflowId]` every 30 seconds
- Shows current workflow status: Running | Completed | Failed
- Shows last update timestamp
- Use this on the Dashboard service cards to show real-time workflow progress

---

## PART 8: UPDATE ENVIRONMENT VARIABLES

Add Temporal config to `.env.local` and `.env.example`:

```bash
# ── Temporal Workflow Engine ──────────────────────────────────
TEMPORAL_ADDRESS=localhost:7233
TEMPORAL_NAMESPACE=divine-financial
TEMPORAL_TASK_QUEUE_PREFIX=dfg
```

Add to GitHub Secrets for production:

```
TEMPORAL_ADDRESS  →  your-vps-ip:7233  (when deployed to VPS)
TEMPORAL_NAMESPACE  →  divine-financial
```

---

## PART 9: ADD ALL SCRIPTS TO PACKAGE.JSON

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "worker": "ts-node temporal/src/worker.ts",
    "worker:dev": "nodemon --watch 'temporal/src/**' --ext ts --exec ts-node temporal/src/worker.ts",
    "dev:full": "concurrently --names 'NEXT,WORKER' --prefix-colors 'blue,green' \"npm run dev\" \"npm run worker:dev\"",
    "schedules:register": "ts-node temporal/src/schedules.ts",
    "backend:start": "cd ../insforge-backend && docker compose -f docker-compose.prod.yml up -d",
    "backend:stop": "cd ../insforge-backend && docker compose -f docker-compose.prod.yml down",
    "backend:logs": "cd ../insforge-backend && docker compose -f docker-compose.prod.yml logs -f"
  }
}
```

---

## PART 10: FINAL VERIFICATION CHECKLIST

```
INFRASTRUCTURE:
□ docker compose ps — InsForge containers healthy
□ curl http://localhost:7130/health — InsForge API responding
□ temporal server running on localhost:7233
□ temporal namespace list — shows 'divine-financial'
□ Temporal Web UI at http://localhost:8080 loads

TEMPORAL WORKER:
□ npm run dev:full — starts Next.js AND Worker together
□ Worker logs show all 7 task queues registered
□ No TypeScript errors in temporal/src/

WORKFLOWS (test each one):
□ Submit Business Formation intake → Temporal Web UI shows running workflow
□ Submit Tax Preparation intake → workflow appears, confirmation email sent
□ Upload file to vault → quarantine → scan → promote pipeline completes
□ Off-hours chat message → callback_queue record created

PUBLIC WEBSITE:
□ All 4 pages load with real DFG content
□ Contact form saves to InsForge and sends email
□ Mobile responsive at 375px (no horizontal scroll)
□ Footer shows correct address, phones, social links

CLIENT PORTAL:
□ Signup → email verification → login flow works
□ Dashboard shows real data from InsForge
□ All 5 intake wizards complete and submit
□ Each submission starts a Temporal workflow (verify in Web UI)
□ Vault upload triggers document pipeline workflow
□ Chat messages persist in InsForge DB
□ Staff admin gated by role — client cannot access

SCHEDULED WORKFLOWS (verify registration):
□ npx ts-node temporal/src/schedules.ts completes without error
□ Temporal Web UI → Schedules shows 3 schedules registered
```

---

## IMPORTANT ARCHITECTURAL NOTES

1. **Temporal Workflows MUST be deterministic.** No `Date.now()`, no `Math.random()`,
   no direct database calls inside Workflow functions. All side effects go in Activities.

2. **The Worker is a separate process from Next.js.** `npm run dev:full` runs both.
   The Worker must be running for any Workflow to make progress.

3. **Signals allow the UI to communicate into running workflows.** When staff clicks
   "Staff Approved" in the admin dashboard, it sends a Temporal Signal into the
   long-running Formation Workflow, allowing it to advance past its wait state.

4. **Workflow IDs are deterministic** — use `formation-{enrollmentId}` format.
   This makes it easy to look up the workflow for any given enrollment.

5. **InsForge handles all simple CRUD.** Temporal handles anything that:
   - Takes more than a few seconds
   - Involves waiting (for payment, for documents, for state approval)
   - Must survive server restarts
   - Has multiple steps that could fail partway through

6. **The Temporal Web UI at localhost:8080** is your real-time dashboard for
   all running workflows. Use it to debug, inspect state, and verify signals work.

---

*Repository: https://github.com/devintax/divine-web-platform.git*
*Temporal: localhost:7233 | Web UI: localhost:8080 | Namespace: divine-financial*
*InsForge: localhost:7130 | Divine Financial Group | (302) 322-5515*

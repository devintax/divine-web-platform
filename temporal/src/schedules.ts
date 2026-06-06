import { getTemporalClient, TASK_QUEUES } from './client';

async function registerSchedules() {
  const client = await getTemporalClient();
  try {
    await client.schedule.create({
      scheduleId: 'dfg-data-retention-cleanup',
      spec: { cronExpressions: ['0 7 * * *'] },
      action: { type: 'startWorkflow', workflowType: 'dataRetentionCleanupWorkflow', taskQueue: TASK_QUEUES.SCHEDULED },
      policies: { overlap: { type: 'SKIP' } as any },
    });
  } catch {}
  try {
    await client.schedule.create({
      scheduleId: 'dfg-compliance-alerts',
      spec: { cronExpressions: ['0 13 * * *'] },
      action: { type: 'startWorkflow', workflowType: 'annualReportComplianceWorkflow', taskQueue: TASK_QUEUES.SCHEDULED },
      policies: { overlap: { type: 'SKIP' } as any },
    });
  } catch {}
  try {
    await client.schedule.create({
      scheduleId: 'dfg-morning-digest',
      spec: { cronExpressions: ['0 14 * * 1-5'] },
      action: { type: 'startWorkflow', workflowType: 'morningDigestWorkflow', taskQueue: TASK_QUEUES.SCHEDULED },
      policies: { overlap: { type: 'SKIP' } as any },
    });
  } catch {}
  console.log('All Temporal schedules registered');
}

registerSchedules().catch(console.error);

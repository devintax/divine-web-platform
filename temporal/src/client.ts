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

export const TASK_QUEUES = {
  FORMATION: 'dfg-formation',
  TAX: 'dfg-tax',
  INSURANCE: 'dfg-insurance',
  NOTARY: 'dfg-notary',
  BOOKKEEPING: 'dfg-bookkeeping',
  VAULT: 'dfg-vault',
  SCHEDULED: 'dfg-scheduled',
} as const;

import { Connection, Client } from '@temporalio/client';

let client: Client | null = null;

export async function getTemporalClient(): Promise<Client> {
  if (client) return client;
  const address = (process.env.TEMPORAL_ADDRESS ?? 'localhost:7233').trim();
  const namespace = (process.env.TEMPORAL_NAMESPACE ?? 'divine-financial').trim();

  const connection = await Connection.connect({
    address,
  });
  client = new Client({
    connection,
    namespace,
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

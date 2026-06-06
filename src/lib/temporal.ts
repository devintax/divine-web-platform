import { Connection, Client } from "@temporalio/client";
import "server-only";

let client: Client | null = null;

export async function getTemporalClient(): Promise<Client> {
  if (client) return client;
  const connection = await Connection.connect({
    address: process.env.TEMPORAL_ADDRESS || "localhost:7233",
  });
  client = new Client({
    connection,
    namespace: process.env.TEMPORAL_NAMESPACE || "default",
  });
  return client;
}

export const TASK_QUEUES = {
  FORMATION: "dfg-formation",
  TAX: "dfg-tax",
  INSURANCE: "dfg-insurance",
  NOTARY: "dfg-notary",
  BOOKKEEPING: "dfg-bookkeeping",
  VAULT: "dfg-vault",
  SCHEDULED: "dfg-scheduled",
} as const;

type WorkflowType =
  | "businessFormationWorkflow"
  | "taxPreparationWorkflow"
  | "autoInsuranceWorkflow"
  | "notaryServicesWorkflow"
  | "bookkeepingOnboardingWorkflow"
  | "documentVaultPipelineWorkflow";

export async function startWorkflow(
  workflowType: WorkflowType,
  taskQueue: string,
  workflowId: string,
  args: Record<string, unknown>[]
) {
  const c = await getTemporalClient();
  const handle = await c.workflow.start(workflowType, {
    taskQueue,
    workflowId,
    args,
  });
  return handle.workflowId;
}

export async function signalWorkflow(workflowId: string, signalName: string, payload?: unknown) {
  const c = await getTemporalClient();
  const handle = c.workflow.getHandle(workflowId);
  await handle.signal(signalName, payload);
}

export async function getWorkflowStatus(workflowId: string) {
  const c = await getTemporalClient();
  const handle = c.workflow.getHandle(workflowId);
  const desc = await handle.describe();
  return desc;
}

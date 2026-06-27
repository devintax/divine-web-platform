import { NextRequest } from "next/server";
import { startServiceWorkflow, signalServiceWorkflow } from "@/lib/api/workflow-route";
import { TASK_QUEUES } from "@/lib/temporal";

export async function POST(req: NextRequest) {
  return startServiceWorkflow(req, {
    service: "vault",
    workflowType: "documentVaultPipelineWorkflow",
    taskQueue: TASK_QUEUES.VAULT,
    idField: "documentId",
  });
}

export async function PATCH(req: NextRequest) {
  return signalServiceWorkflow(req, {
    service: "vault",
    workflowType: "documentVaultPipelineWorkflow",
    taskQueue: TASK_QUEUES.VAULT,
    idField: "documentId",
  });
}

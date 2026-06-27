import { NextRequest } from "next/server";
import { startServiceWorkflow, signalServiceWorkflow } from "@/lib/api/workflow-route";
import { TASK_QUEUES } from "@/lib/temporal";

export async function POST(req: NextRequest) {
  return startServiceWorkflow(req, {
    service: "tax",
    workflowType: "taxPreparationWorkflow",
    taskQueue: TASK_QUEUES.TAX,
    idField: "enrollmentId",
  });
}

export async function PATCH(req: NextRequest) {
  return signalServiceWorkflow(req, {
    service: "tax",
    workflowType: "taxPreparationWorkflow",
    taskQueue: TASK_QUEUES.TAX,
    idField: "enrollmentId",
  });
}

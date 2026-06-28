import "server-only";
import { TASK_QUEUES, startWorkflow } from "@/lib/temporal";
import type { ServiceType } from "@/lib/service-workflow";

const WORKFLOW_CONFIG: Record<ServiceType, { workflowType: Parameters<typeof startWorkflow>[0]; taskQueue: string }> = {
  tax: { workflowType: "taxPreparationWorkflow", taskQueue: TASK_QUEUES.TAX },
  formation: { workflowType: "businessFormationWorkflow", taskQueue: TASK_QUEUES.FORMATION },
  insurance: { workflowType: "autoInsuranceWorkflow", taskQueue: TASK_QUEUES.INSURANCE },
  notary: { workflowType: "notaryServicesWorkflow", taskQueue: TASK_QUEUES.NOTARY },
  bookkeeping: { workflowType: "bookkeepingOnboardingWorkflow", taskQueue: TASK_QUEUES.BOOKKEEPING },
};

export async function startEnrollmentWorkflow(input: {
  enrollmentId: string;
  userId: string;
  serviceType: ServiceType;
  payload?: Record<string, unknown>;
}) {
  const config = WORKFLOW_CONFIG[input.serviceType];
  const workflowId = `${input.serviceType}-${input.enrollmentId}`;
  const startedWorkflowId = await startWorkflow(config.workflowType, config.taskQueue, workflowId, [
    {
      ...(input.payload || {}),
      enrollmentId: input.enrollmentId,
      userId: input.userId,
      serviceType: input.serviceType,
    },
  ]);
  return startedWorkflowId || workflowId;
}

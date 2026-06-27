export { signalWorkflow } from "@/lib/temporal";

export const SIGNALS = {
  PAYMENT_COMPLETED: "paymentCompleted",
  DOCUMENTS_UPLOADED: "documentsUploaded",
  STAFF_APPROVED: "staffApproved",
  CLIENT_APPROVED: "clientApprovedSignal",
  DELIVERABLE_READY: "deliverableReadySignal",
} as const;

export function workflowId(service: string, id: string) {
  return `${service}-${id}`;
}

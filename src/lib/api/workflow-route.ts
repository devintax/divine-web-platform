import { NextRequest } from "next/server";
import { getAuthSession } from "@/lib/auth-server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { startWorkflow, signalWorkflow } from "@/lib/temporal";
import { writeAuditLog } from "@/lib/audit";

type WorkflowType =
  | "businessFormationWorkflow"
  | "taxPreparationWorkflow"
  | "autoInsuranceWorkflow"
  | "notaryServicesWorkflow"
  | "bookkeepingOnboardingWorkflow"
  | "documentVaultPipelineWorkflow";

interface WorkflowConfig {
  service: "formation" | "tax" | "insurance" | "notary" | "bookkeeping" | "vault";
  workflowType: WorkflowType;
  taskQueue: string;
  idField: "enrollmentId" | "documentId";
}

interface ValidatedWorkflowRequest {
  body: Record<string, unknown>;
  resourceId: string;
  userId: string;
  userRole: string;
}

const STAFF_ROLES = new Set(["super_admin", "manager", "accountant", "specialist", "broker", "notary", "tax_intern", "support"]);

function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

async function readJson(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) return null;
    return body as Record<string, unknown>;
  } catch {
    return null;
  }
}

async function validateWorkflowRequest(req: NextRequest, config: WorkflowConfig): Promise<Response | ValidatedWorkflowRequest> {
  const session = await getAuthSession();
  if (!session) return jsonError("Authentication required.", 401);

  const body = await readJson(req);
  if (!body) return jsonError("Invalid request body.", 400);

  const resourceId = body[config.idField];
  if (typeof resourceId !== "string" || !resourceId.trim()) {
    return jsonError(`${config.idField} is required.`, 422);
  }

  const isStaff = STAFF_ROLES.has(session.role);
  const admin = getSupabaseAdmin();

  if (config.idField === "enrollmentId") {
    const { data: enrollment } = await admin
      .from("service_enrollments")
      .select("id,user_id,service_type")
      .eq("id", resourceId)
      .single();

    if (!enrollment) return jsonError("Enrollment not found.", 404);
    if (!isStaff && enrollment.user_id !== session.profileId) {
      return jsonError("Access denied to this enrollment.", 403);
    }
  } else {
    const { data: doc } = await admin
      .from("vault_documents")
      .select("id,user_id")
      .eq("id", resourceId)
      .single();

    if (doc && !isStaff && doc.user_id !== session.profileId) {
      return jsonError("Access denied to this document.", 403);
    }
  }

  return {
    body,
    resourceId,
    userId: session.profileId,
    userRole: session.role,
  };
}

export function safeWorkflowResponse(error: unknown): Response {
  console.error("[Workflow API Error]", error);
  return Response.json(
    { error: "Workflow could not be started. Please try again or call (302) 322-5515." },
    { status: 500 },
  );
}

export async function startServiceWorkflow(req: NextRequest, config: WorkflowConfig) {
  const result = await validateWorkflowRequest(req, config);
  if (result instanceof Response) return result;

  const workflowId = `${config.service}-${result.resourceId}`;

  try {
    const startedWorkflowId = await startWorkflow(config.workflowType, config.taskQueue, workflowId, [
      { ...result.body, [config.idField]: result.resourceId, userId: result.userId },
    ]);

    if (config.idField === "enrollmentId") {
      await getSupabaseAdmin()
        .from("service_enrollments")
        .update({ workflow_id: startedWorkflowId })
        .eq("id", result.resourceId);
    }

    await writeAuditLog({
      userId: result.userId,
      action: `${config.service}_workflow_started`,
      resourceType: config.idField === "enrollmentId" ? "enrollment" : "document",
      resourceId: result.resourceId,
      eventCategory: "workflow",
      metadata: { workflowId: startedWorkflowId, role: result.userRole },
    });

    return Response.json({ success: true, workflowId: startedWorkflowId }, { status: 201 });
  } catch (error) {
    return safeWorkflowResponse(error);
  }
}

export async function signalServiceWorkflow(req: NextRequest, config: WorkflowConfig) {
  const result = await validateWorkflowRequest(req, config);
  if (result instanceof Response) return result;

  const signal = result.body.signal;
  if (typeof signal !== "string" || !signal.trim()) {
    return jsonError("Signal name is required.", 422);
  }

  const workflowId = `${config.service}-${result.resourceId}`;

  try {
    await signalWorkflow(workflowId, signal, result.body.payload);
    await writeAuditLog({
      userId: result.userId,
      action: "workflow_signal_sent",
      resourceType: config.idField === "enrollmentId" ? "enrollment" : "document",
      resourceId: result.resourceId,
      eventCategory: "workflow",
      metadata: { signal, workflowId, role: result.userRole },
    });

    return Response.json({ ok: true });
  } catch (error) {
    return safeWorkflowResponse(error);
  }
}

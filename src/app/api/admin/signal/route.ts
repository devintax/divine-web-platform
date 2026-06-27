import { NextRequest, NextResponse } from "next/server";
import { getTemporalClient } from "@/lib/temporal";
import { verifyStaff } from "@/lib/auth-server";
import { logAudit } from "@/lib/audit";
import { can } from "@/lib/rbac/can";

export async function POST(req: NextRequest) {
  const session = await verifyStaff();
  if (!session || !can(session.role, "signal_workflow")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const body = await req.json();
    const { workflowId, signalName, enrollmentId, args } = body;
    if (!workflowId || !signalName) return NextResponse.json({ error: "workflowId and signalName required" }, { status: 400 });

    const client = await getTemporalClient();
    const handle = client.workflow.getHandle(workflowId);
    await handle.signal(signalName, ...(args || []));
    await logAudit({
      staffId: session.profileId,
      action: "workflow_signal_sent",
      resourceType: "enrollment",
      resourceId: enrollmentId || workflowId,
      eventCategory: "workflow",
      metadata: { workflowId, signal: signalName },
    });
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("[admin/signal]", e);
    return NextResponse.json({ error: "Signal failed" }, { status: 500 });
  }
}

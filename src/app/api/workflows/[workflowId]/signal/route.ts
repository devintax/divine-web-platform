import { NextRequest, NextResponse } from "next/server";
import { verifyStaff } from "@/lib/auth-server";
import { can } from "@/lib/rbac/can";
import { signalWorkflow } from "@/lib/temporal";
import { logAudit } from "@/lib/audit";

export async function POST(req: NextRequest, { params }: { params: Promise<{ workflowId: string }> }) {
  const session = await verifyStaff();
  if (!session || !can(session.role, "signal_workflow")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { workflowId } = await params;
  const body = await req.json().catch(() => ({}));
  const signal = String(body.signal || body.signalName || "").trim();
  if (!signal) return NextResponse.json({ error: "signal is required" }, { status: 400 });

  try {
    await signalWorkflow(workflowId, signal, body.payload);
    await logAudit({ staffId: session.profileId, action: "workflow_signal_sent", resourceType: "workflow", resourceId: workflowId, eventCategory: "workflow", metadata: { signal } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[workflow signal]", error);
    return NextResponse.json({ error: "Signal failed" }, { status: 500 });
  }
}

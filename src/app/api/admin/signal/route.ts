import { NextRequest, NextResponse } from "next/server";
import { getTemporalClient } from "@/lib/temporal";
import { verifyStaff } from "@/lib/auth-server";

export async function POST(req: NextRequest) {
  const session = await verifyStaff();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  try {
    const body = await req.json();
    const { workflowId, signalName, args } = body;
    if (!workflowId || !signalName) return NextResponse.json({ error: "workflowId and signalName required" }, { status: 400 });

    const client = await getTemporalClient();
    const handle = client.workflow.getHandle(workflowId);
    await handle.signal(signalName, ...(args || []));
    return NextResponse.json({ success: true });
  } catch (e: any) {
    console.error("[admin/signal]", e);
    return NextResponse.json({ error: e.message || "Signal failed" }, { status: 500 });
  }
}

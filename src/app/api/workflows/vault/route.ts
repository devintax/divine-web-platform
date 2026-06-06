import { NextRequest, NextResponse } from "next/server";
import { startWorkflow } from "@/lib/temporal";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { documentId, userId, category, displayName } = body;
    const workflowId = await startWorkflow("documentVaultPipelineWorkflow", "dfg-vault", `vault-${documentId}`, [{
      documentId, userId, category, displayName,
    }]);
    return NextResponse.json({ success: true, workflowId }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { startWorkflow } from "@/lib/temporal";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { enrollmentId, userId, clientEmail, clientName, clientPhone, zipCode, vehicleUsage, driverHistory } = body;
    const workflowId = await startWorkflow("autoInsuranceWorkflow", "dfg-insurance", `insurance-${enrollmentId}`, [{
      enrollmentId, userId, clientEmail, clientName, clientPhone, zipCode, vehicleUsage, driverHistory,
    }]);
    return NextResponse.json({ success: true, workflowId }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

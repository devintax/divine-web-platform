import { NextRequest, NextResponse } from "next/server";
import { verifyStaff } from "@/lib/auth-server";
import { logAudit } from "@/lib/audit";
import { can } from "@/lib/rbac/can";

export async function POST(req: NextRequest) {
  const session = await verifyStaff();
  if (!session || !can(session.role, "break_glass_override")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { reason, caseId } = await req.json();
  if (!reason || !caseId) return NextResponse.json({ error: "Reason and caseId are required" }, { status: 400 });
  await logAudit({
    action: "admin_override",
    staffId: session.profileId,
    resourceType: "service_enrollment",
    resourceId: caseId,
    eventCategory: "admin",
    metadata: { reason },
  });
  return NextResponse.json({ success: true });
}

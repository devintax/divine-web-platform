import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { logAudit } from "@/lib/audit";

async function getUserId() {
  const store = await cookies();
  return store.get("d_user_id")?.value || null;
}

export async function POST(req: NextRequest) {
  const uid = await getUserId();
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { reason, caseId } = await req.json();
  await logAudit({ action: "admin_override", staffId: uid, resourceType: "service_enrollment", resourceId: caseId, metadata: { reason } });
  return NextResponse.json({ success: true });
}

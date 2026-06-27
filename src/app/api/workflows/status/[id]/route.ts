import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth-server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { can } from "@/lib/rbac/can";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getAuthSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const admin = getSupabaseAdmin();
  const { data: enrollment } = await admin.from("service_enrollments").select("id,user_id,service_type,status,progress,workflow_id,current_step,updated_at").eq("id", id).single();
  if (!enrollment) return NextResponse.json({ error: "Workflow not found" }, { status: 404 });
  if (enrollment.user_id !== session.profileId && !can(session.role, "view_workflow_status")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return NextResponse.json({ workflow: enrollment });
}

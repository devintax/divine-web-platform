import { NextResponse } from "next/server";
import { verifyStaff } from "@/lib/auth-server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { can } from "@/lib/rbac/can";

export async function GET() {
  const user = await verifyStaff();
  if (!user || !can(user.role, "view_all_audit_logs")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const admin = getSupabaseAdmin();
  const { data, error } = await admin.from("audit_logs").select("id,event_id,action,resource_type,event_category,metadata,created_at").order("created_at", { ascending: false }).limit(50);
  if (error) return NextResponse.json({ error: "Could not load audit logs" }, { status: 500 });
  return NextResponse.json({ logs: data || [] });
}

import { NextResponse } from "next/server";
import { verifySuperAdmin } from "@/lib/auth-server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function GET() {
  const user = await verifySuperAdmin();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  const admin = getSupabaseAdmin();
  const { data, error } = await admin.from("audit_logs").select("id,event_id,action,resource_type,metadata,created_at").order("created_at", { ascending: false }).limit(50);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ logs: data || [] });
}

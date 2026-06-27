import { NextResponse } from "next/server";
import { verifyStaff } from "@/lib/auth-server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { can } from "@/lib/rbac/can";

export async function GET() {
  const session = await verifyStaff();
  if (!session || !can(session.role, "view_case_queue")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const admin = getSupabaseAdmin();
  const { data, error } = await admin.from("service_enrollments").select("id,user_id,service_type,status,progress,created_at,updated_at")
    .in("status", ["pending","active","draft"]).order("created_at", { ascending: false }).limit(50);
  if (error) return NextResponse.json({ error: "Could not load case queue" }, { status: 500 });

  const rows = (data || []) as any[];
  const ids = [...new Set(rows.map((d) => d.user_id))];
  const { data: profiles } = await admin.from("user_profiles").select("id,legal_name").in("id", ids);
  const nameMap: Record<string, string> = {};
  ((profiles || []) as any[]).forEach((p) => { nameMap[p.id] = p.legal_name || "Unknown"; });

  return NextResponse.json({ cases: rows.map((d) => ({ id: d.id, client: nameMap[d.user_id] || "Unknown", service: d.service_type, status: d.status, progress: d.progress, createdAt: d.created_at, updatedAt: d.updated_at })) });
}

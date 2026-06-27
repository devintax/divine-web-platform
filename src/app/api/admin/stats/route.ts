import { NextResponse } from "next/server";
import { verifyStaff } from "@/lib/auth-server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { can } from "@/lib/rbac/can";

export async function GET() {
  const session = await verifyStaff();
  if (!session || !can(session.role, "view_system_health_dashboard")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const admin = getSupabaseAdmin();
  const { data, error } = await admin.from("service_enrollments").select("status");
  if (error) return NextResponse.json({ error: "Could not load admin stats" }, { status: 500 });
  const counts = { draft: 0, pending: 0, active: 0, completed: 0, cancelled: 0 };
  ((data || []) as { status: string }[]).forEach((e) => { if (counts[e.status as keyof typeof counts] !== undefined) counts[e.status as keyof typeof counts]++; });
  return NextResponse.json({ newIntakes: counts.draft + counts.pending, missingDocs: counts.draft, inReview: counts.pending + counts.active, ready: counts.completed });
}

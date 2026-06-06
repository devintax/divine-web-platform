import { NextResponse } from "next/server";
import { verifyStaff } from "@/lib/auth-server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function GET() {
  const session = await verifyStaff();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const admin = getSupabaseAdmin();
  const { data, error } = await admin.from("service_enrollments").select("status");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const counts = { draft: 0, pending: 0, active: 0, completed: 0, cancelled: 0 };
  ((data || []) as { status: string }[]).forEach((e) => { if (counts[e.status as keyof typeof counts] !== undefined) counts[e.status as keyof typeof counts]++; });
  return NextResponse.json({ newIntakes: counts.draft + counts.pending, missingDocs: counts.draft, inReview: counts.pending + counts.active, ready: counts.completed });
}

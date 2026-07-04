import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth-server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { logAudit } from "@/lib/audit";

export async function GET() {
  const session = await getAuthSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("service_enrollments")
    .select("id,status,progress,intake_data,updated_at,created_at")
    .eq("user_id", session.profileId)
    .eq("service_type", "bookkeeping")
    .order("updated_at", { ascending: false })
    .limit(1)
    .single();

  if (error || !data) return NextResponse.json({ enrollment: null, transactions: [], reports: [] });
  const intake = ((data as any).intake_data || {}) as any;
  return NextResponse.json({
    enrollment: data,
    transactions: intake.transactions || [],
    reports: intake.reports || [],
  });
}

export async function PATCH(req: NextRequest) {
  const session = await getAuthSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const admin = getSupabaseAdmin();
  const { data: enrollment } = await admin
    .from("service_enrollments")
    .select("id,intake_data")
    .eq("user_id", session.profileId)
    .eq("service_type", "bookkeeping")
    .order("updated_at", { ascending: false })
    .limit(1)
    .single();

  if (!enrollment) return NextResponse.json({ error: "No bookkeeping enrollment found" }, { status: 404 });

  const intake = ((enrollment as any).intake_data || {}) as any;
  const transactions = Array.isArray(body.transactions) ? body.transactions.slice(0, 500) : intake.transactions || [];
  const reports = Array.isArray(body.reports) ? body.reports.slice(0, 100) : intake.reports || [];

  const { error } = await admin
    .from("service_enrollments")
    .update({ intake_data: { ...intake, transactions, reports }, updated_at: new Date().toISOString() })
    .eq("id", (enrollment as any).id);

  if (error) return NextResponse.json({ error: "Could not save bookkeeping view" }, { status: 500 });
  await logAudit({ userId: session.profileId, action: "bookkeeping_client_view_updated", resourceType: "service_enrollment", resourceId: (enrollment as any).id, eventCategory: "workflow" });
  return NextResponse.json({ success: true, transactions, reports });
}

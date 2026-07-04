import { NextResponse } from "next/server";
import { verifyStaff } from "@/lib/auth-server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

type FormationEnrollment = {
  id: string;
  user_id: string;
  status: string | null;
  created_at: string | null;
  intake_data: {
    businessName?: string;
    business_name?: string;
    entityType?: string;
    state?: string;
    stateOfFormation?: string;
  } | null;
  client?: {
    legal_name?: string | null;
    email?: string | null;
    phone?: string | null;
  } | null;
};

export async function GET() {
  const session = await verifyStaff();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("service_enrollments")
    .select("id,user_id,status,created_at,intake_data")
    .eq("service_type", "formation")
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) return NextResponse.json({ error: "Could not load compliance calendar" }, { status: 500 });

  const rows = (data || []) as FormationEnrollment[];
  const userIds = [...new Set(rows.map((row) => row.user_id).filter(Boolean))];
  const { data: clients } = userIds.length
    ? await admin.from("user_profiles").select("id,legal_name,email,phone").in("id", userIds)
    : { data: [] };
  const clientMap = ((clients as any[]) || []).reduce((acc: Record<string, any>, client: any) => {
    acc[client.id] = client;
    return acc;
  }, {});

  const events = rows.map((row) => {
    const formed = row.created_at ? new Date(row.created_at) : new Date();
    const due = nextAnnualReportDate(formed);
    const daysUntilDue = Math.ceil((due.getTime() - Date.now()) / 86_400_000);
    const intake = row.intake_data || {};
    return {
      id: row.id,
      enrollmentId: row.id,
      client: clientMap[row.user_id] || null,
      businessName: intake.businessName || intake.business_name || "Business formation client",
      entityType: intake.entityType || "Entity",
      state: intake.state || intake.stateOfFormation || "DE",
      status: row.status || "pending",
      dueDate: due.toISOString(),
      daysUntilDue,
      priority: daysUntilDue < 0 ? "overdue" : daysUntilDue <= 30 ? "urgent" : daysUntilDue <= 90 ? "soon" : "normal",
      staffAction: daysUntilDue <= 90 ? "Call client and confirm annual report/registered agent needs." : "Monitor upcoming compliance date.",
    };
  });

  return NextResponse.json({ events });
}

function nextAnnualReportDate(formed: Date) {
  const year = new Date().getFullYear();
  const candidate = new Date(Date.UTC(year, 2, 1, 17, 0, 0));
  if (candidate.getTime() < Date.now()) candidate.setUTCFullYear(year + 1);
  if (formed.getUTCFullYear() === year && formed.getUTCMonth() >= 2) candidate.setUTCFullYear(year + 1);
  return candidate;
}

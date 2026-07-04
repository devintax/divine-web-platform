import { NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth-server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function GET() {
  const session = await getAuthSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("service_enrollments")
    .select("id,status,progress,intake_data,created_at,updated_at")
    .eq("user_id", session.profileId)
    .eq("service_type", "formation")
    .order("updated_at", { ascending: false });

  if (error) return NextResponse.json({ error: "Could not load entities" }, { status: 500 });

  const entities = ((data as any[]) || []).map((row) => {
    const intake = row.intake_data || {};
    return {
      id: row.id,
      name: intake.businessName || intake.business_name || "Business entity",
      entityType: intake.entityType || "Entity",
      state: intake.state || intake.stateOfFormation || "DE",
      status: row.status,
      progress: row.progress,
      registeredAgent: intake.agentChoice === "divine" ? "Divine Financial Group" : intake.agentName || "Not assigned",
      annualReportDue: nextAnnualReportDate(row.created_at ? new Date(row.created_at) : new Date()).toISOString(),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  });

  return NextResponse.json({ entities });
}

function nextAnnualReportDate(formed: Date) {
  const year = new Date().getFullYear();
  const candidate = new Date(Date.UTC(year, 2, 1, 17, 0, 0));
  if (candidate.getTime() < Date.now()) candidate.setUTCFullYear(year + 1);
  if (formed.getUTCFullYear() === year && formed.getUTCMonth() >= 2) candidate.setUTCFullYear(year + 1);
  return candidate;
}

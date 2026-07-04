import { NextResponse } from "next/server";
import { verifyStaff } from "@/lib/auth-server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function GET() {
  const session = await verifyStaff();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("service_enrollments")
    .select("id,user_id,status,intake_data,created_at,updated_at")
    .eq("service_type", "formation")
    .order("updated_at", { ascending: false })
    .limit(100);

  if (error) return NextResponse.json({ error: "Could not load registered agent records" }, { status: 500 });
  const rows = (data as any[]) || [];
  const userIds = [...new Set(rows.map((row) => row.user_id).filter(Boolean))];
  const { data: clients } = userIds.length
    ? await admin.from("user_profiles").select("id,legal_name,email,phone").in("id", userIds)
    : { data: [] };
  const clientMap = ((clients as any[]) || []).reduce((acc: Record<string, any>, client: any) => {
    acc[client.id] = client;
    return acc;
  }, {});

  const records = rows.map((row) => {
    const intake = row.intake_data || {};
    const usesDivine = intake.agentChoice === "divine" || intake.useDivineAgent === true;
    return {
      id: row.id,
      client: clientMap[row.user_id] || null,
      businessName: intake.businessName || intake.business_name || "Business entity",
      entityType: intake.entityType || "Entity",
      state: intake.state || "DE",
      agentName: usesDivine ? "Divine Financial Group" : intake.agentName || "External / pending",
      usesDivineAgent: usesDivine,
      status: row.status,
      sopCount: intake.sopDocuments?.length || 0,
      lastUpdated: row.updated_at || row.created_at,
    };
  });

  return NextResponse.json({ records });
}

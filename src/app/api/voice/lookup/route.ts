import { NextRequest, NextResponse } from "next/server";
import { verifyStaff } from "@/lib/auth-server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function GET(req: NextRequest) {
  const session = await verifyStaff();
  if (!session) return NextResponse.json({ error: "Staff only" }, { status: 403 });

  const phone = req.nextUrl.searchParams.get("phone") || "";
  const digits = phone.replace(/\D/g, "").slice(-10);
  if (!digits) return NextResponse.json({ client: null, cases: [] });

  const admin = getSupabaseAdmin();
  const { data: clients } = await admin
    .from("user_profiles")
    .select("id,legal_name,email,phone,role")
    .ilike("phone", `%${digits}%`)
    .limit(1);
  const client = clients?.[0] || null;
  if (!client) return NextResponse.json({ client: null, cases: [] });

  const { data: cases } = await admin
    .from("service_enrollments")
    .select("id,service_type,status,progress,priority,updated_at")
    .eq("user_id", client.id)
    .order("updated_at", { ascending: false })
    .limit(8);

  return NextResponse.json({ client, cases: cases || [] });
}

import { NextRequest, NextResponse } from "next/server";
import { verifyStaff } from "@/lib/auth-server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function GET(req: NextRequest) {
  const session = await verifyStaff();
  if (!session) return NextResponse.json({ error: "Staff only" }, { status: 403 });

  const limit = Math.min(100, Math.max(1, Number(req.nextUrl.searchParams.get("limit") || 50)));
  const { data, error } = await getSupabaseAdmin()
    .from("call_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) return NextResponse.json({ calls: [], error: "Call logs are not ready" });
  return NextResponse.json({ calls: data || [] });
}

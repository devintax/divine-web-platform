import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function GET() {
  const store = await cookies();
  const uid = store.get("d_user_id")?.value;
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const admin = getSupabaseAdmin();
  const { data: profile } = await admin.from("user_profiles").select("*").eq("auth_user_id", uid).single();
  if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  return NextResponse.json({ profile });
}

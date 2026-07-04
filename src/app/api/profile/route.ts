import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/session-token";

export async function GET() {
  const store = await cookies();
  const uid = verifySessionToken(store.get(SESSION_COOKIE_NAME)?.value || null)?.authId;
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const admin = getSupabaseAdmin();
  const { data: profile } = await admin.from("user_profiles").select("*").eq("auth_user_id", uid).single();
  if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  return NextResponse.json({ profile });
}

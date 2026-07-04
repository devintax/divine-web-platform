import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

function expectedToken() {
  return process.env.E2E_TEST_TOKEN || process.env.SESSION_SECRET || process.env.INSFORGE_SERVICE_KEY || "";
}

export async function POST(req: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not available in production" }, { status: 404 });
  }
  const token = req.headers.get("x-e2e-token") || "";
  if (!expectedToken() || token !== expectedToken()) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { authUserId, role } = await req.json().catch(() => ({}));
  if (!authUserId || !role) return NextResponse.json({ error: "authUserId and role are required" }, { status: 400 });

  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("user_profiles")
    .update({
      role,
      email_verified: true,
      email_verified_at: new Date().toISOString(),
      email_verify_token: null,
      email_verify_expiry: null,
      updated_at: new Date().toISOString(),
    })
    .eq("auth_user_id", authUserId)
    .select("id,auth_user_id,email,role")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true, profile: data });
}

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { checkRateLimit, clientIp, rateLimitResponse } from "@/lib/rate-limit";
import { verifyTwoFactorChallenge } from "@/lib/two-factor";
import { createSessionToken, LEGACY_SESSION_COOKIE_NAME, SESSION_COOKIE_NAME, SESSION_COOKIE_OPTIONS } from "@/lib/session-token";

const SESSION_COOKIE = SESSION_COOKIE_OPTIONS;

export async function POST(req: NextRequest) {
  const limit = checkRateLimit({ key: `verify-2fa:${clientIp(req)}`, limit: 8, windowMs: 15 * 60 * 1000 });
  if (!limit.allowed) return rateLimitResponse(limit.resetAt);

  const { code } = await req.json().catch(() => ({}));
  const challenge = req.cookies.get("d_2fa_challenge")?.value;
  const payload = verifyTwoFactorChallenge(challenge, String(code || "").trim());
  if (!payload) return NextResponse.json({ error: "Invalid or expired verification code." }, { status: 401 });

  const admin = getSupabaseAdmin();
  const { data: profile } = await admin
    .from("user_profiles")
    .select("id,role,legal_name,email,is_active")
    .eq("id", payload.profileId)
    .eq("auth_user_id", payload.authId)
    .single();

  if (!profile) return NextResponse.json({ error: "Account not found." }, { status: 404 });

  const response = NextResponse.json({ success: true, userId: payload.authId, profile, message: "Login successful" });
  response.cookies.set(SESSION_COOKIE_NAME, createSessionToken(payload.authId), SESSION_COOKIE);
  response.cookies.set(LEGACY_SESSION_COOKIE_NAME, "", { ...SESSION_COOKIE, maxAge: 0 });
  response.cookies.set("d_2fa_challenge", "", { ...SESSION_COOKIE, maxAge: 0 });
  return response;
}

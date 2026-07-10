import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@insforge/sdk";
import { verifyEmailToken } from "@/lib/email-verification";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { createSessionToken, LEGACY_SESSION_COOKIE_NAME, SESSION_COOKIE_NAME, SESSION_COOKIE_OPTIONS } from "@/lib/session-token";

const BASE = process.env.NEXT_PUBLIC_INSFORGE_URL || process.env.INSFORGE_URL || "https://insforge.dfgworld.net";
const KEY = process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY || process.env.INSFORGE_ANON_KEY || "";

function authClient() {
  return createClient({
    baseUrl: BASE,
    anonKey: KEY,
    isServerMode: true,
  });
}

export async function POST(req: NextRequest) {
  const { token, email, code } = await req.json().catch(() => ({}));

  if (email && code) {
    const normalizedEmail = String(email).trim().toLowerCase();
    const otp = String(code).replace(/\D/g, "");
    if (!normalizedEmail || otp.length !== 6) {
      return NextResponse.json({ error: "Email and 6-digit verification code are required." }, { status: 400 });
    }

    const verification = await authClient().auth.verifyEmail({
      email: normalizedEmail,
      otp,
    });

    if (verification.error) {
      return NextResponse.json(
        { error: verification.error.message || "Invalid or expired verification code." },
        { status: verification.error.statusCode || 400 },
      );
    }

    const authUserId = verification.data?.user?.id;
    const admin = getSupabaseAdmin();
    const query = admin
      .from("user_profiles")
      .update({
        email_verified: true,
        email_verified_at: new Date().toISOString(),
        email_verify_token: null,
        email_verify_expiry: null,
        updated_at: new Date().toISOString(),
      });

    const { data: profile, error: profileError } = await (authUserId
      ? query.eq("auth_user_id", authUserId)
      : query.eq("email", normalizedEmail)
    )
      .select("id,auth_user_id,email")
      .single();

    if (profileError || !profile) {
      console.error("[auth/verify-email] profile update failed", profileError);
      return NextResponse.json({ error: "Email verified, but the profile could not be updated. Please contact support." }, { status: 500 });
    }

    const response = NextResponse.json({ success: true, message: "Email verified" });
    response.cookies.set(SESSION_COOKIE_NAME, createSessionToken(profile.auth_user_id), SESSION_COOKIE_OPTIONS);
    response.cookies.set(LEGACY_SESSION_COOKIE_NAME, "", { ...SESSION_COOKIE_OPTIONS, maxAge: 0 });
    return response;
  }

  const result = await verifyEmailToken(String(token || ""));
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });

  const response = NextResponse.json({ success: true, message: "Email verified" });
  response.cookies.set(SESSION_COOKIE_NAME, createSessionToken(result.profile.auth_user_id), SESSION_COOKIE_OPTIONS);
  response.cookies.set(LEGACY_SESSION_COOKIE_NAME, "", { ...SESSION_COOKIE_OPTIONS, maxAge: 0 });
  return response;
}

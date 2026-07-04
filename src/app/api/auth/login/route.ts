import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { DFGEmail } from "@/lib/email/dfg-email";
import { createTwoFactorChallenge } from "@/lib/two-factor";
import { createSessionToken, LEGACY_SESSION_COOKIE_NAME, SESSION_COOKIE_NAME, SESSION_COOKIE_OPTIONS } from "@/lib/session-token";

const BASE = process.env.NEXT_PUBLIC_INSFORGE_URL || process.env.INSFORGE_URL || "https://insforge.dfgworld.net";
const KEY = process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY || "";
const AUTH_TIMEOUT_MS = 10_000;
const SESSION_COOKIE = SESSION_COOKIE_OPTIONS;

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json().catch(() => ({}));
    const normalizedEmail = String(email || "").trim().toLowerCase();
    if (!normalizedEmail || !password) {
      return NextResponse.json({ error: "Email and password required" }, { status: 400 });
    }

    let res: Response;
    try {
      res = await fetch(`${BASE}/api/auth/sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "apikey": KEY },
        body: JSON.stringify({ email: normalizedEmail, password }),
        signal: AbortSignal.timeout(AUTH_TIMEOUT_MS),
      });
    } catch (error) {
      console.error("InsForge auth service unreachable:", error);
      return NextResponse.json(
        { error: "Authentication service is unavailable. Please try again in a moment." },
        { status: 503 },
      );
    }

    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      const error = json.error === "AUTH_UNAUTHORIZED"
        ? "Invalid email or password."
        : json.message || json.error || "Login failed";
      return NextResponse.json({ error }, { status: res.status });
    }
    const userId = json.user?.id || json.id;
    if (!userId) {
      return NextResponse.json({ error: "Login failed" }, { status: 500 });
    }

    const admin = getSupabaseAdmin();
    const { data: profile } = await admin.from("user_profiles").select("id,role,legal_name,email,is_active,email_verified").eq("auth_user_id", userId).single();
    if (profile) {
      await admin.from("user_profiles").update({ updated_at: new Date().toISOString() }).eq("id", profile.id);
    }
    if (profile && profile.email_verified === false) {
      return NextResponse.json(
        { error: "Please verify your email before signing in. Check your inbox for the verification link." },
        { status: 403 },
      );
    }

    if (profile) {
      const { data: settings } = await admin
        .from("user_settings")
        .select("two_factor_enabled")
        .eq("user_id", profile.id)
        .single();

      if ((settings as any)?.two_factor_enabled === true) {
        const { code, token, maxAgeSeconds } = createTwoFactorChallenge({
          authId: userId,
          profileId: profile.id,
          email: profile.email || normalizedEmail,
        });
        await DFGEmail.twoFactorCode(profile.email || normalizedEmail, profile.legal_name, code);
        const response = NextResponse.json({
          success: false,
          requiresTwoFactor: true,
          email: profile.email || normalizedEmail,
          message: "Verification code sent.",
        });
        response.cookies.set("d_2fa_challenge", token, { ...SESSION_COOKIE, maxAge: maxAgeSeconds });
        return response;
      }
    }

    const response = NextResponse.json({ success: true, userId, profile: profile || null, message: "Login successful" });
    response.cookies.set(SESSION_COOKIE_NAME, createSessionToken(userId), SESSION_COOKIE);
    response.cookies.set(LEGACY_SESSION_COOKIE_NAME, "", { ...SESSION_COOKIE, maxAge: 0 });
    return response;
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Login failed" }, { status: 500 });
  }
}

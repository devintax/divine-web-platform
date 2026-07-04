import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { createTwoFactorChallenge, sendTwoFactorCode } from "@/lib/two-factor";
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
    let { data: profile } = await admin
      .from("user_profiles")
      .select("id,role,legal_name,email,phone,is_active,email_verified")
      .eq("auth_user_id", userId)
      .single();

    if (!profile) {
      const { data: profileByEmail } = await admin
        .from("user_profiles")
        .select("id,role,legal_name,email,phone,is_active,email_verified")
        .eq("email", normalizedEmail)
        .single();

      if (profileByEmail) {
        const { data: repairedProfile, error: repairError } = await admin
          .from("user_profiles")
          .update({
            auth_user_id: userId,
            updated_at: new Date().toISOString(),
          })
          .eq("id", profileByEmail.id)
          .select("id,role,legal_name,email,phone,is_active,email_verified")
          .single();

        if (repairError || !repairedProfile) {
          console.error("[auth/login] profile auth mapping repair failed:", repairError);
          return NextResponse.json({ error: "Account profile is unavailable. Please contact support." }, { status: 500 });
        }

        profile = repairedProfile;
      }
    }

    if (!profile) {
      const displayName = json.user?.profile?.name || json.user?.name || normalizedEmail.split("@")[0];
      const { data: createdProfile, error: createProfileError } = await admin
        .from("user_profiles")
        .insert({
          id: userId,
          auth_user_id: userId,
          legal_name: displayName,
          email: json.user?.email || normalizedEmail,
          role: "client",
          is_active: true,
          email_verified: json.user?.emailVerified !== false,
          email_verified_at: json.user?.emailVerified === false ? null : new Date().toISOString(),
        })
        .select("id,role,legal_name,email,phone,is_active,email_verified")
        .single();
      if (createProfileError || !createdProfile) {
        console.error("[auth/login] profile bootstrap failed:", createProfileError);
        return NextResponse.json({ error: "Account profile is missing. Please contact support." }, { status: 500 });
      }
      await admin.from("user_settings").insert({
        user_id: createdProfile.id,
        email_on_message: true,
        email_on_update: true,
        email_on_complete: true,
        sms_on_message: true,
        sms_on_update: false,
      });
      profile = createdProfile;
    }
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
        const twoFactorDelivery = await sendTwoFactorCode({
          code,
          email: profile.email || normalizedEmail,
          phone: profile.phone,
          legalName: profile.legal_name,
        });
        const response = NextResponse.json({
          success: false,
          requiresTwoFactor: true,
          email: profile.email || normalizedEmail,
          channel: twoFactorDelivery.channel,
          hint: twoFactorDelivery.hint,
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

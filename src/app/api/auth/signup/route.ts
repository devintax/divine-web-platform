import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@insforge/sdk";
import { DFGEmail } from "@/lib/email/dfg-email";
import { createEmailVerification } from "@/lib/email-verification";
import { checkRateLimit, clientIp, rateLimitResponse } from "@/lib/rate-limit";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

const BASE = process.env.NEXT_PUBLIC_INSFORGE_URL || process.env.INSFORGE_URL || "https://insforge.dfgworld.net";
const KEY = process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY || process.env.INSFORGE_ANON_KEY || "";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export async function POST(req: NextRequest) {
  try {
    const limit = checkRateLimit({ key: `signup:${clientIp(req)}`, limit: 5, windowMs: 60 * 60 * 1000 });
    if (!limit.allowed) return rateLimitResponse(limit.resetAt);

    const { email, password, name, legalName } = await req.json();
    const normalizedEmail = String(email || "").trim().toLowerCase();
    const displayName = String(name || legalName || normalizedEmail.split("@")[0]).trim();
    if (!normalizedEmail || !password) {
      return NextResponse.json({ error: "Email and password required" }, { status: 400 });
    }

    const insforge = createClient({
      baseUrl: BASE,
      anonKey: KEY,
      isServerMode: true,
    });

    const auth = await insforge.auth.signUp({
      email: normalizedEmail,
      password,
      name: displayName,
    });
    if (auth.error) {
      return NextResponse.json({ error: auth.error.message || "Signup failed" }, { status: auth.error.statusCode || 400 });
    }

    const userId = auth.data?.user?.id;
    if (!userId) {
      return NextResponse.json({ error: "User creation failed" }, { status: 500 });
    }

    const admin = getSupabaseAdmin();
    const { data: profile, error: profileErr } = await admin.from("user_profiles").insert({
      id: userId,
      auth_user_id: userId,
      legal_name: displayName,
      email: normalizedEmail,
      role: "client",
      is_active: true,
      email_verified: false,
    }).select("id").single();

    if (profileErr) {
      console.error("Profile creation failed:", profileErr);
      return NextResponse.json({ error: "Account created but profile setup failed. Please contact support." }, { status: 500 });
    }

    await admin.from("user_settings").insert({
      user_id: profile?.id || userId,
      email_on_message: true,
      email_on_update: true,
      email_on_complete: true,
      sms_on_message: true,
      sms_on_update: false,
    });

    const { token } = await createEmailVerification(userId);
    const verifyUrl = `${APP_URL}/verify-email?token=${encodeURIComponent(token)}`;
    const verification = await DFGEmail.emailVerification(normalizedEmail, displayName, verifyUrl);
    if (!verification.sent && !verification.skipped) {
      console.error("[auth/signup] DFG verification email failed", verification.error);
    }

    const welcome = await DFGEmail.welcome(normalizedEmail, displayName);
    if (!welcome.sent && !welcome.skipped) {
      console.warn("[auth/signup] welcome email skipped or failed", welcome.error);
    }

    return NextResponse.json({
      success: true,
      requiresEmailVerification: true,
      emailSent: verification.sent,
      emailWarning: verification.sent ? null : "Account created. Email delivery is delayed; contact support if the verification email does not arrive.",
      email: normalizedEmail,
      userId,
      profileId: profile?.id,
      message: "Account created. Please verify your email before signing in.",
    }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Signup failed" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@insforge/sdk";
import { checkRateLimit, clientIp, rateLimitResponse } from "@/lib/rate-limit";
import { publicAppUrl } from "@/lib/app-url";

export const runtime = "nodejs";

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
  const { email } = await req.json().catch(() => ({}));
  const normalizedEmail = String(email || "").trim().toLowerCase();

  if (!normalizedEmail) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }
  const limit = checkRateLimit({ key: `password-reset:${clientIp(req)}:${normalizedEmail}`, limit: 3, windowMs: 60 * 60 * 1000 });
  if (!limit.allowed) return rateLimitResponse(limit.resetAt);

  const { data, error } = await authClient().auth.sendResetPasswordEmail({
    email: normalizedEmail,
    redirectTo: publicAppUrl("/reset-password"),
  });

  if (error) {
    console.error("[auth/password-reset] send failed", error);
    return NextResponse.json(
      { error: "Could not send password reset email. Please contact support." },
      { status: error.statusCode || 502 },
    );
  }

  return NextResponse.json({
    success: data?.success !== false,
    message: data?.message || "Password reset email sent",
  });
}

export async function PUT(req: NextRequest) {
  const { token, email, code, password } = await req.json().catch(() => ({}));
  let resetToken = String(token || "").trim();
  const resetCode = String(code || "").replace(/\D/g, "");
  const newPassword = String(password || "");
  const resetIdentity = email ? String(email).trim().toLowerCase() : resetToken.slice(0, 12);
  const limit = checkRateLimit({ key: `password-reset-confirm:${clientIp(req)}:${resetIdentity}`, limit: 5, windowMs: 60 * 60 * 1000 });
  if (!limit.allowed) return rateLimitResponse(limit.resetAt);

  if (!resetToken && email && resetCode) {
    const exchange = await authClient().auth.exchangeResetPasswordToken({
      email: String(email).trim().toLowerCase(),
      code: resetCode,
    });

    if (exchange.error || !exchange.data?.token) {
      return NextResponse.json(
        { error: exchange.error?.message || "Invalid or expired reset code." },
        { status: exchange.error?.statusCode || 400 },
      );
    }

    resetToken = exchange.data.token;
  }

  if (!resetToken || !newPassword) {
    return NextResponse.json({ error: "Reset token or code and new password are required" }, { status: 400 });
  }

  if (newPassword.length < 10) {
    return NextResponse.json({ error: "Password must be at least 10 characters" }, { status: 422 });
  }

  const { data, error } = await authClient().auth.resetPassword({
    otp: resetToken,
    newPassword,
  });

  if (error) {
    console.error("[auth/password-reset] reset failed", error);
    return NextResponse.json(
      { error: error.message || "Password reset failed. Please request a new link." },
      { status: error.statusCode || 400 },
    );
  }

  return NextResponse.json({
    success: true,
    message: data?.message || "Password reset successfully. Please sign in with your new password.",
  });
}

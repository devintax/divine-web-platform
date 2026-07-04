import { NextRequest, NextResponse } from "next/server";
import { verifyEmailToken } from "@/lib/email-verification";
import { createSessionToken, LEGACY_SESSION_COOKIE_NAME, SESSION_COOKIE_NAME, SESSION_COOKIE_OPTIONS } from "@/lib/session-token";

export async function POST(req: NextRequest) {
  const { token } = await req.json().catch(() => ({}));
  const result = await verifyEmailToken(String(token || ""));
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });

  const response = NextResponse.json({ success: true, message: "Email verified" });
  response.cookies.set(SESSION_COOKIE_NAME, createSessionToken(result.profile.auth_user_id), SESSION_COOKIE_OPTIONS);
  response.cookies.set(LEGACY_SESSION_COOKIE_NAME, "", { ...SESSION_COOKIE_OPTIONS, maxAge: 0 });
  return response;
}

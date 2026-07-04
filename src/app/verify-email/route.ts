import { NextRequest, NextResponse } from "next/server";
import { verifyEmailToken } from "@/lib/email-verification";
import { createSessionToken, LEGACY_SESSION_COOKIE_NAME, SESSION_COOKIE_NAME, SESSION_COOKIE_OPTIONS } from "@/lib/session-token";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token") || "";
  const loginUrl = new URL("/login", req.url);
  if (!token) {
    loginUrl.searchParams.set("verified", "missing");
    return NextResponse.redirect(loginUrl);
  }

  const result = await verifyEmailToken(token);
  if (!result.ok) {
    loginUrl.searchParams.set("verified", "error");
    loginUrl.searchParams.set("message", result.error);
    return NextResponse.redirect(loginUrl);
  }

  const portalUrl = new URL("/portal", req.url);
  portalUrl.searchParams.set("verified", "1");
  const response = NextResponse.redirect(portalUrl);
  response.cookies.set(SESSION_COOKIE_NAME, createSessionToken(result.profile.auth_user_id), SESSION_COOKIE_OPTIONS);
  response.cookies.set(LEGACY_SESSION_COOKIE_NAME, "", { ...SESSION_COOKIE_OPTIONS, maxAge: 0 });
  return response;
}

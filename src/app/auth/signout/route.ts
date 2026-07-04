import { type NextRequest, NextResponse } from "next/server";
import { LEGACY_SESSION_COOKIE_NAME, SESSION_COOKIE_NAME } from "@/lib/session-token";

export async function GET(request: NextRequest) {
  const res = NextResponse.redirect(new URL("/", request.url), { status: 302 });
  res.cookies.set(SESSION_COOKIE_NAME, "", { maxAge: -1, path: "/", httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production" });
  res.cookies.set(LEGACY_SESSION_COOKIE_NAME, "", { maxAge: -1, path: "/", httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production" });
  res.cookies.set("d_2fa_challenge", "", { maxAge: -1, path: "/", httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production" });
  return res;
}

export async function POST(request: NextRequest) {
  const res = NextResponse.redirect(new URL("/", request.url), { status: 302 });
  res.cookies.set(SESSION_COOKIE_NAME, "", { maxAge: -1, path: "/", httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production" });
  res.cookies.set(LEGACY_SESSION_COOKIE_NAME, "", { maxAge: -1, path: "/", httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production" });
  res.cookies.set("d_2fa_challenge", "", { maxAge: -1, path: "/", httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production" });
  return res;
}

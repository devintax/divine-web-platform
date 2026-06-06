import { type NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const res = NextResponse.redirect(new URL("/", request.url), { status: 302 });
  res.cookies.set("d_user_id", "", { maxAge: -1, path: "/" });
  return res;
}

export async function POST(request: NextRequest) {
  const res = NextResponse.redirect(new URL("/", request.url), { status: 302 });
  res.cookies.set("d_user_id", "", { maxAge: -1, path: "/" });
  return res;
}

import { type NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { origin } = new URL(request.url);
  // InsForge handles OAuth callbacks automatically in browser mode.
  // This route is a fallback — clear any stale state and redirect.
  const res = NextResponse.redirect(`${origin}/portal`);
  return res;
}

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { LEGACY_SESSION_COOKIE_NAME, SESSION_COOKIE_NAME } from "@/lib/session-token";

export async function POST() {
  const store = await cookies();
  store.delete(SESSION_COOKIE_NAME);
  store.delete(LEGACY_SESSION_COOKIE_NAME);
  store.delete("d_2fa_challenge");
  return NextResponse.json({ success: true }, { status: 200 });
}

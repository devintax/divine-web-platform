import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

const BASE = process.env.NEXT_PUBLIC_INSFORGE_URL || "http://127.0.0.1:7130";
const KEY = process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY || "";
const AUTH_TIMEOUT_MS = 10_000;

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();
    if (!email || !password) {
      return NextResponse.json({ error: "Email and password required" }, { status: 400 });
    }

    let res: Response;
    try {
      res = await fetch(`${BASE}/api/auth/sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "apikey": KEY },
        body: JSON.stringify({ email, password }),
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
    const { data: profile } = await admin.from("user_profiles").select("id,role,legal_name,email,is_active").eq("auth_user_id", userId).single();
    if (profile) {
      await admin.from("user_profiles").update({ updated_at: new Date().toISOString() }).eq("id", profile.id);
    }

    const response = NextResponse.json({ success: true, userId, profile: profile || null, message: "Login successful" });
    response.cookies.set("d_user_id", userId, { path: "/", sameSite: "lax", maxAge: 60 * 60 * 24 * 7 });
    return response;
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Login failed" }, { status: 500 });
  }
}

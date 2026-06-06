import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

const BASE = process.env.NEXT_PUBLIC_INSFORGE_URL || "http://127.0.0.1:7130";
const KEY = process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY || "";

export async function POST(req: NextRequest) {
  try {
    const { email, password, name } = await req.json();
    if (!email || !password) {
      return NextResponse.json({ error: "Email and password required" }, { status: 400 });
    }

    const res = await fetch(`${BASE}/api/auth/users`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "apikey": KEY },
      body: JSON.stringify({ email, password, name: name || email.split("@")[0] }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      return NextResponse.json({ error: json.error || json.message || "Signup failed" }, { status: res.status });
    }
    const userId = json.user?.id || json.id;
    if (!userId) {
      return NextResponse.json({ error: "User creation failed" }, { status: 500 });
    }

    const admin = getSupabaseAdmin();
    const { data: profile, error: profileErr } = await admin.from("user_profiles").insert({
      auth_user_id: userId,
      legal_name: name || email.split("@")[0],
      email,
      role: "client",
      is_active: true,
    }).select("id").single();

    if (profileErr) {
      console.error("Profile creation failed:", profileErr);
      return NextResponse.json({ error: "Account created but profile setup failed. Please contact support." }, { status: 500 });
    }

    return NextResponse.json({ success: true, userId, profileId: profile?.id, message: "Account created successfully" }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Signup failed" }, { status: 500 });
  }
}

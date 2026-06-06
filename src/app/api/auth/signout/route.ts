import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function POST() {
  const store = await cookies();
  const authId = store.get("d_user_id")?.value;
  if (authId) {
    try {
      const admin = getSupabaseAdmin();
      await admin.from("user_profiles").update({ is_active: false, updated_at: new Date().toISOString() }).eq("auth_user_id", authId);
    } catch {}
  }
  store.delete("d_user_id");
  return NextResponse.json({ success: true }, { status: 200 });
}

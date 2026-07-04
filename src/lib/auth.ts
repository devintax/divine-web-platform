import { cookies } from "next/headers";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/session-token";

export async function getAuthUser() {
  const store = await cookies();
  const payload = verifySessionToken(store.get(SESSION_COOKIE_NAME)?.value || null);
  return { id: payload?.authId || null };
}

export async function verifyStaff() {
  const { id } = await getAuthUser();
  if (!id) return null;
  const admin = getSupabaseAdmin();
  const { data: profile } = await admin.from("user_profiles").select("role").eq("id", id).single();
  if (!profile || !["manager","accountant","specialist","broker","tax_intern","support"].includes(profile.role!)) return null;
  return { id };
}

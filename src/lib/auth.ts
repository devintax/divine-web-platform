import { cookies } from "next/headers";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function getAuthUser() {
  const store = await cookies();
  return { id: store.get("d_user_id")?.value || null };
}

export async function verifyStaff() {
  const { id } = await getAuthUser();
  if (!id) return null;
  const admin = getSupabaseAdmin();
  const { data: profile } = await admin.from("user_profiles").select("role").eq("id", id).single();
  if (!profile || !["manager","accountant","specialist","broker","tax_intern","support"].includes(profile.role!)) return null;
  return { id };
}

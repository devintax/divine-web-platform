import { cookies } from "next/headers";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import type { UserRole } from "@/lib/rbac/roles";

export async function getAuthSession() {
  const store = await cookies();
  const authId = store.get("d_user_id")?.value || null;
  if (!authId) return null;

  const admin = getSupabaseAdmin();
  const { data: profile } = await admin
    .from("user_profiles")
    .select("id,role,legal_name,email,phone")
    .eq("auth_user_id", authId)
    .single();

  if (!profile) return null;

  return {
    authId,
    profileId: profile.id,
    role: profile.role as UserRole,
    legalName: profile.legal_name,
    email: profile.email,
    phone: profile.phone,
  };
}

const STAFF_ROLES = ["manager","accountant","specialist","broker","tax_intern","support","super_admin"];

export async function verifyStaff() {
  const session = await getAuthSession();
  if (!session) return null;
  if (!STAFF_ROLES.includes(session.role!)) return null;
  return session;
}

export async function verifySuperAdmin() {
  const session = await getAuthSession();
  if (!session) return null;
  if (session.role !== "super_admin") return null;
  return session;
}

export async function verifyManagerOrSuperAdmin() {
  const session = await getAuthSession();
  if (!session) return null;
  if (session.role !== "super_admin" && session.role !== "manager") return null;
  return session;
}

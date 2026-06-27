import { NextRequest, NextResponse } from "next/server";
import { verifyStaff } from "@/lib/auth-server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { logAudit } from "@/lib/audit";
import type { UserRole } from "@/lib/rbac/roles";
import { ROLES } from "@/lib/rbac/roles";
import { can } from "@/lib/rbac/can";

export async function GET() {
  const user = await verifyStaff();
  if (!user || !can(user.role, "view_staff_accounts")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const admin = getSupabaseAdmin();
  const { data: profiles, error } = await admin.from("user_profiles").select("id,legal_name,role,created_at,email").order("created_at", { ascending: true });
  if (error) return NextResponse.json({ error: "Could not load users" }, { status: 500 });
  return NextResponse.json({ users: (profiles || []).map((p: any) => ({ id: p.id, legal_name: p.legal_name || "", role: p.role || "client", email: p.email || "" })) });
}

export async function PATCH(req: NextRequest) {
  const user = await verifyStaff();
  if (!user || !can(user.role, "assign_any_role")) return NextResponse.json({ error: "Only a Super Administrator can assign roles" }, { status: 403 });
  const { userId, role } = await req.json();
  const valid: UserRole[] = ROLES
  if (!userId || !valid.includes(role)) return NextResponse.json({ error: "Invalid userId or role" }, { status: 400 });
  const admin = getSupabaseAdmin();
  const { data: previous } = await admin.from("user_profiles").select("role").eq("id", userId).single();
  const { error } = await admin.from("user_profiles").update({ role, updated_at: new Date().toISOString() }).eq("id", userId);
  if (error) return NextResponse.json({ error: "Could not update role" }, { status: 500 });
  await logAudit({
    action: "user_role_changed",
    userId,
    staffId: user.profileId,
    resourceType: "user_profile",
    resourceId: userId,
    eventCategory: "rbac",
    metadata: { old_role: previous?.role || null, new_role: role },
  });
  return NextResponse.json({ success: true });
}

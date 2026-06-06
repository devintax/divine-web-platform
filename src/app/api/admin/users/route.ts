import { NextRequest, NextResponse } from "next/server";
import { verifySuperAdmin } from "@/lib/auth-server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { logAudit } from "@/lib/audit";

export async function GET() {
  const user = await verifySuperAdmin();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  const admin = getSupabaseAdmin();
  const { data: profiles, error } = await admin.from("user_profiles").select("id,legal_name,role,created_at,email").order("created_at", { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ users: (profiles || []).map((p: any) => ({ id: p.id, legal_name: p.legal_name || "", role: p.role || "client", email: p.email || "" })) });
}

export async function PATCH(req: NextRequest) {
  const user = await verifySuperAdmin();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  const { userId, role } = await req.json();
  const valid = ["client","manager","accountant","specialist","broker","tax_intern","support","super_admin"];
  if (!userId || !valid.includes(role)) return NextResponse.json({ error: "Invalid userId or role" }, { status: 400 });
  const admin = getSupabaseAdmin();
  const { error } = await admin.from("user_profiles").update({ role, updated_at: new Date().toISOString() }).eq("id", userId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  await logAudit({ action: "role_changed", userId, staffId: user.profileId, resourceType: "user_profile", resourceId: userId, metadata: { new_role: role } });
  return NextResponse.json({ success: true });
}

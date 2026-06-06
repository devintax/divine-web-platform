import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth-server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function GET(req: NextRequest) {
  const session = await getAuthSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = getSupabaseAdmin();
  const { data: profile } = await admin.from("user_profiles").select("role").eq("auth_user_id", session.authId).single();
  const isStaff = profile && ["manager","accountant","specialist","broker","tax_intern","support"].includes(profile.role!);

  let q = admin.from("vault_documents").select("*").eq("is_deleted", false);
  if (req.nextUrl.searchParams.get("userId") && isStaff) q = q.eq("user_id", req.nextUrl.searchParams.get("userId"));
  else q = q.eq("user_id", session.profileId);

  const { data, error } = await q.order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ files: data || [] });
}

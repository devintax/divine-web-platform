import { NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth-server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function GET() {
  const session = await getAuthSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  return NextResponse.json({
    id: session.profileId,
    auth_user_id: session.authId,
    legal_name: session.legalName,
    email: session.email,
    phone: session.phone,
    role: session.role,
    avatar_url: await avatarUrl(session.profileId),
  });
}

async function avatarUrl(profileId: string) {
  const { data: profile } = await getSupabaseAdmin()
    .from("user_profiles")
    .select("avatar_url")
    .eq("id", profileId)
    .single();
  return profile?.avatar_url || null;
}

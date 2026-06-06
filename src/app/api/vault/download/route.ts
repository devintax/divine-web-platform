import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth-server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function GET(req: NextRequest) {
  const session = await getAuthSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const docId = req.nextUrl.searchParams.get("id");
  if (!docId) return NextResponse.json({ error: "Missing document ID" }, { status: 400 });

  const admin = getSupabaseAdmin();
  const { data: doc, error } = await admin.from("vault_documents").select("*").eq("id", docId).single();
  if (error || !doc) return NextResponse.json({ error: "Document not found" }, { status: 404 });

  const { data: profile } = await admin.from("user_profiles").select("role").eq("id", session.profileId).single();
  const isStaff = profile && ["manager","accountant","specialist","broker","tax_intern","support"].includes(profile.role!);
  if (doc.user_id !== session.profileId && !isStaff) return NextResponse.json({ error: "Access denied" }, { status: 403 });

  return NextResponse.json({ url: doc.storage_url || doc.storage_path, fileName: doc.display_name });
}

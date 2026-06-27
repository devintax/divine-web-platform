import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth-server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { can } from "@/lib/rbac/can";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getAuthSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { data: doc, error } = await getSupabaseAdmin().from("vault_documents").select("id,user_id,status,virus_scanned,virus_clean,updated_at").eq("id", id).single();
  if (error || !doc) return NextResponse.json({ error: "Document not found" }, { status: 404 });
  if (doc.user_id !== session.profileId && !can(session.role, "vault_view_file_metadata")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return NextResponse.json({ document: doc });
}

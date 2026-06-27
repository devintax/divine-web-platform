import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth-server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { can } from "@/lib/rbac/can";

export async function GET(req: NextRequest) {
  const session = await getAuthSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const docId = req.nextUrl.searchParams.get("id");
  if (!docId) return NextResponse.json({ error: "Missing document ID" }, { status: 400 });

  const admin = getSupabaseAdmin();
  const { data: doc, error } = await admin.from("vault_documents").select("*").eq("id", docId).single();
  if (error || !doc) return NextResponse.json({ error: "Document not found" }, { status: 404 });

  if (doc.is_deleted) return NextResponse.json({ error: "Document not found" }, { status: 404 });
  if (doc.user_id !== session.profileId && !can(session.role, "vault_download_file")) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }
  if (doc.status !== "clean" && doc.status !== "archived") {
    return NextResponse.json({ error: "Document is not cleared for download" }, { status: 409 });
  }

  return NextResponse.json({ url: `/api/vault/download/${doc.id}`, fileName: doc.display_name || doc.file_name });
}

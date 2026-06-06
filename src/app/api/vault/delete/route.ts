import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth-server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { logAudit } from "@/lib/audit";

export async function POST(req: NextRequest) {
  const session = await getAuthSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: "Missing document ID" }, { status: 400 });

  const admin = getSupabaseAdmin();
  const { data: doc } = await admin.from("vault_documents").select("user_id, display_name").eq("id", id).single();
  if (!doc) return NextResponse.json({ error: "Document not found" }, { status: 404 });
  if (doc.user_id !== session.profileId) return NextResponse.json({ error: "Access denied" }, { status: 403 });

  const { error } = await admin.from("vault_documents").update({ is_deleted: true }).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await logAudit({ action: "vault_document_deleted", userId: session.profileId, resourceType: "vault_document", resourceId: id, metadata: { display_name: doc.display_name } });
  return NextResponse.json({ success: true });
}

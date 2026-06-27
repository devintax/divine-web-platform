import { NextRequest, NextResponse } from "next/server";
import { verifyStaff, verifyManagerOrSuperAdmin } from "@/lib/auth-server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { writeAuditLog } from "@/lib/audit";

export async function GET(req: NextRequest) {
  const session = await verifyStaff();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const category = req.nextUrl.searchParams.get("category");
  const admin = getSupabaseAdmin();
  let query = admin.from("knowledge_base").select("*").eq("is_active", true).order("created_at", { ascending: false });
  if (category && category !== "all") query = query.eq("category", category);

  const { data, error } = await query;
  if (error) return NextResponse.json({ articles: [], error: "Knowledge base is not ready" });
  return NextResponse.json({ articles: data || [] });
}

export async function POST(req: NextRequest) {
  const session = await verifyManagerOrSuperAdmin();
  if (!session) return NextResponse.json({ error: "Manager access required" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const title = String(body.title || "").trim();
  const content = String(body.content || "").trim();
  if (!title || !content) return NextResponse.json({ error: "Title and content are required" }, { status: 422 });

  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("knowledge_base")
    .insert({
      title,
      content,
      category: String(body.category || "general"),
      created_by: session.profileId,
      is_active: true,
    })
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: "Could not save article" }, { status: 500 });
  await writeAuditLog({
    staffId: session.profileId,
    action: "knowledge_article_created",
    resourceType: "knowledge_base",
    resourceId: data?.id,
    eventCategory: "admin",
  });
  return NextResponse.json({ article: data }, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const session = await verifyManagerOrSuperAdmin();
  if (!session) return NextResponse.json({ error: "Manager access required" }, { status: 403 });
  const { id } = await req.json().catch(() => ({}));
  if (!id) return NextResponse.json({ error: "Article id required" }, { status: 422 });

  const admin = getSupabaseAdmin();
  const { error } = await admin.from("knowledge_base").update({ is_active: false, updated_at: new Date().toISOString() }).eq("id", id);
  if (error) return NextResponse.json({ error: "Could not archive article" }, { status: 500 });
  await writeAuditLog({
    staffId: session.profileId,
    action: "knowledge_article_archived",
    resourceType: "knowledge_base",
    resourceId: id,
    eventCategory: "admin",
  });
  return NextResponse.json({ ok: true });
}

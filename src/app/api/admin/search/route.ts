import { NextRequest, NextResponse } from "next/server";
import { verifyStaff } from "@/lib/auth-server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function GET(req: NextRequest) {
  const session = await verifyStaff();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const q = req.nextUrl.searchParams.get("q")?.trim();
  if (!q || q.length < 2) return NextResponse.json({ results: { clients: [], enrollments: [], documents: [] } });

  const admin = getSupabaseAdmin();
  const [clients, enrollments, documents] = await Promise.all([
    admin
      .from("user_profiles")
      .select("id,legal_name,email,phone,role")
      .eq("role", "client")
      .or(`legal_name.ilike.%${q}%,email.ilike.%${q}%,phone.ilike.%${q}%`)
      .limit(6),
    admin
      .from("service_enrollments")
      .select("id,service_type,status,user_id,created_at")
      .or(`id.ilike.%${q}%,service_type.ilike.%${q}%,status.ilike.%${q}%`)
      .limit(6),
    admin
      .from("vault_documents")
      .select("id,display_name,file_name,category,user_id,created_at")
      .or(`display_name.ilike.%${q}%,file_name.ilike.%${q}%`)
      .neq("is_deleted", true)
      .limit(6),
  ]);

  return NextResponse.json({
    results: {
      clients: clients.data || [],
      enrollments: enrollments.data || [],
      documents: documents.data || [],
    },
  });
}

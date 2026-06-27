import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth-server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { generateConciergeReply } from "@/lib/chat/concierge";

export async function POST(req: NextRequest) {
  const session = await getAuthSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { message } = await req.json();
  if (!message?.trim()) return NextResponse.json({ error: "Message required" }, { status: 400 });

  const admin = getSupabaseAdmin();
  await admin.from("chat_messages").insert({ user_id: session.profileId, role: "user", content: message });

  const result = await generateConciergeReply(message, {
    profileId: session.profileId,
    legalName: session.legalName,
    email: session.email,
    phone: session.phone,
  });
  await admin.from("chat_messages").insert({ user_id: session.profileId, role: "bot", content: result.reply });

  return NextResponse.json(result);
}

export async function GET() {
  const session = await getAuthSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const admin = getSupabaseAdmin();
  const { data, error } = await admin.from("chat_messages").select("id, role, content, created_at").eq("user_id", session.profileId).order("created_at", { ascending: true }).limit(100);
  if (error) return NextResponse.json({ error: "Could not load chat history" }, { status: 500 });
  return NextResponse.json({ messages: data || [] });
}

import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth-server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { generateConciergeReply } from "@/lib/chat/concierge";
import { chatWithAI } from "@/lib/ai/dfg-ai";
import { checkRateLimit, clientIp, rateLimitResponse } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  const limit = checkRateLimit({ key: `ai-chat:${clientIp(req)}`, limit: 30, windowMs: 60 * 60 * 1000 });
  if (!limit.allowed) return rateLimitResponse(limit.resetAt);

  const session = await getAuthSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { message } = await req.json();
  if (!message?.trim()) return NextResponse.json({ error: "Message required" }, { status: 400 });

  const admin = getSupabaseAdmin();
  await admin.from("chat_messages").insert({ user_id: session.profileId, role: "user", content: message });

  const fallback = await generateConciergeReply(message, {
    profileId: session.profileId,
    legalName: session.legalName,
    email: session.email,
    phone: session.phone,
  });

  const [{ data: enrollments }, { data: history }] = await Promise.all([
    admin
      .from("service_enrollments")
      .select("service_type,status,progress,client_message,updated_at")
      .eq("user_id", session.profileId)
      .order("updated_at", { ascending: false })
      .limit(5),
    admin
      .from("chat_messages")
      .select("role,content")
      .eq("user_id", session.profileId)
      .order("created_at", { ascending: false })
      .limit(8),
  ]);

  const ai = await chatWithAI({
    messages: [
      {
        role: "system",
        content:
          "You are Divine Assistant for Divine Financial Group. Answer in a warm, concise way using only platform context. Do not give legal, tax, or insurance advice; route users to intake, Orders, Vault, Messages, or staff support when needed.",
      },
      {
        role: "user",
        content: JSON.stringify({
          client: { name: session.legalName, email: session.email },
          activeServices: enrollments || [],
          detectedIntent: fallback.intent,
          suggestedHref: fallback.href,
          recentMessages: (history || []).reverse(),
          message,
        }),
      },
    ],
    maxTokens: 360,
    temperature: 0.25,
  });

  const result = {
    ...fallback,
    reply: ai.text || fallback.reply,
    ai: {
      provider: ai.provider,
      model: ai.model,
      usedFallback: !ai.text,
    },
  };

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

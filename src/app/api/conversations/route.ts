import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth-server";
import { createConversation, listConversations, type ConversationAudience, type ConversationType } from "@/lib/conversations";

export async function GET() {
  const session = await getAuthSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const conversations = await listConversations(session);
    return NextResponse.json({ conversations });
  } catch (error) {
    console.error("[conversations] list failed", error);
    if (isMissingConversationSchema(error)) {
      return NextResponse.json({
        error: "Conversation database tables are not installed yet.",
        code: "schema_missing",
      }, { status: 503 });
    }
    return NextResponse.json({ error: "Could not load conversations" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getAuthSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const result = await createConversation({
      session,
      type: String(body.type || "direct") as ConversationType,
      title: typeof body.title === "string" ? body.title : undefined,
      participantIds: Array.isArray(body.participantIds) ? body.participantIds.map(String) : [],
      audience: body.audience ? String(body.audience) as ConversationAudience : undefined,
      initialMessage: typeof body.message === "string" ? body.message : undefined,
    });
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not create conversation";
    if (isMissingConversationSchema(error)) {
      return NextResponse.json({
        error: "Conversation database tables are not installed yet.",
        code: "schema_missing",
      }, { status: 503 });
    }
    const status = /not allowed|Only staff|Only managers|Forbidden/i.test(message) ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}

function isMissingConversationSchema(error: unknown) {
  const maybe = error as { code?: string; message?: string };
  return maybe?.code === "42P01" || /conversation(_participants|_messages)?\"? does not exist/i.test(maybe?.message || "");
}

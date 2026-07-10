import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth-server";
import { listConversationMessages, sendConversationMessage } from "@/lib/conversations";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getAuthSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { id } = await params;
    const result = await listConversationMessages(session, id);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not load messages";
    if (isMissingConversationSchema(error)) {
      return NextResponse.json({ error: "Conversation database tables are not installed yet.", code: "schema_missing" }, { status: 503 });
    }
    const status = message === "Conversation not found" ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getAuthSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { id } = await params;
    const body = await req.json();
    const message = await sendConversationMessage({
      session,
      conversationId: id,
      body: String(body.message || ""),
    });
    return NextResponse.json({ success: true, message });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not send message";
    if (isMissingConversationSchema(error)) {
      return NextResponse.json({ error: "Conversation database tables are not installed yet.", code: "schema_missing" }, { status: 503 });
    }
    const status = message === "Conversation not found" ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}

function isMissingConversationSchema(error: unknown) {
  const maybe = error as { code?: string; message?: string };
  return maybe?.code === "42P01" || /conversation(_participants|_messages)?\"? does not exist/i.test(maybe?.message || "");
}

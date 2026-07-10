import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth-server";
import { listConversationRecipients } from "@/lib/conversations";

export async function GET(req: NextRequest) {
  const session = await getAuthSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const search = req.nextUrl.searchParams.get("q") || "";
    const recipients = await listConversationRecipients(session, search);
    return NextResponse.json({ recipients });
  } catch (error) {
    console.error("[conversations] recipients failed", error);
    const maybe = error as { code?: string; message?: string };
    if (maybe?.code === "42P01") {
      return NextResponse.json({ error: "Conversation database tables are not installed yet.", code: "schema_missing" }, { status: 503 });
    }
    return NextResponse.json({ error: "Could not load recipients" }, { status: 500 });
  }
}

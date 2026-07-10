import { getAuthSession } from "@/lib/auth-server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function GET() {
  const session = await getAuthSession();
  if (!session) return new Response("Unauthorized", { status: 401 });
  const profileId = session.profileId;
  let interval: ReturnType<typeof setInterval> | null = null;
  let closed = false;

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();

      async function sendSnapshot() {
        if (closed) return;
        try {
          const admin = getSupabaseAdmin();
          const { data: enrollments } = await admin
            .from("service_enrollments")
            .select("id,status,progress,updated_at")
            .eq("user_id", profileId)
            .order("updated_at", { ascending: false })
            .limit(20);

          const ids = ((enrollments as any[]) || []).map((row) => row.id);
          const { count: unreadMessages } = ids.length
            ? await admin
                .from("case_messages")
                .select("id", { count: "exact", head: true })
                .in("enrollment_id", ids)
                .eq("sender_type", "staff")
                .eq("read_by_client", false)
            : { count: 0 };

          let unreadConversations = 0;
          try {
            const { data: memberships } = await admin
              .from("conversation_participants")
              .select("conversation_id,last_read_at")
              .eq("user_id", profileId)
              .eq("is_archived", false);
            const membershipRows = ((memberships as any[]) || []);
            const conversationIds = membershipRows.map((row) => row.conversation_id);
            const { data: conversationMessages } = conversationIds.length
              ? await admin
                  .from("conversation_messages")
                  .select("id,conversation_id,sender_id,created_at")
                  .in("conversation_id", conversationIds)
                  .neq("sender_id", profileId)
                  .order("created_at", { ascending: false })
                  .limit(500)
              : { data: [] };
            const lastReadByConversation = new Map(
              membershipRows.map((row) => [row.conversation_id, row.last_read_at ? new Date(row.last_read_at).getTime() : 0]),
            );
            unreadConversations = ((conversationMessages as any[]) || []).filter((message) => {
              const lastReadAt = lastReadByConversation.get(message.conversation_id) || 0;
              return new Date(message.created_at).getTime() > lastReadAt;
            }).length;
          } catch (conversationError) {
            console.warn("[portal-events] conversation snapshot skipped:", conversationError instanceof Error ? conversationError.message : conversationError);
          }

          if (closed) return;
          controller.enqueue(
            encoder.encode(`event: portal-update\ndata: ${JSON.stringify({ enrollments: enrollments || [], unreadMessages: unreadMessages || 0, unreadConversations, sentAt: new Date().toISOString() })}\n\n`),
          );
        } catch (error) {
          if (!closed) {
            console.warn("[portal-events] snapshot skipped:", error instanceof Error ? error.message : error);
          }
        }
      }

      void sendSnapshot();
      interval = setInterval(sendSnapshot, 15000);
    },
    cancel() {
      closed = true;
      if (interval) clearInterval(interval);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}

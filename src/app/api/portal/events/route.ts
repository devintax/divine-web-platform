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

          if (closed) return;
          controller.enqueue(
            encoder.encode(`event: portal-update\ndata: ${JSON.stringify({ enrollments: enrollments || [], unreadMessages: unreadMessages || 0, sentAt: new Date().toISOString() })}\n\n`),
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

import "server-only";

import { getSupabaseAdmin } from "@/lib/supabase-admin";

export type NotificationType = "info" | "message" | "document" | "review" | "complete" | "warning";

export async function createNotification(params: {
  userId: string | null | undefined;
  title: string;
  body?: string | null;
  type?: NotificationType;
  href?: string | null;
  relatedResourceType?: string | null;
  relatedResourceId?: string | null;
}) {
  if (!params.userId) return null;
  const { data, error } = await getSupabaseAdmin()
    .from("notifications")
    .insert({
      user_id: params.userId,
      title: params.title,
      body: params.body || null,
      type: params.type || "info",
      href: params.href || null,
      related_resource_type: params.relatedResourceType || null,
      related_resource_id: params.relatedResourceId || null,
    })
    .select("*")
    .single();
  if (error) {
    console.error("[notifications] create failed", error);
    return null;
  }
  return data;
}

export async function listNotifications(userId: string, limit = 20) {
  const admin = getSupabaseAdmin();
  const [{ data }, { count }] = await Promise.all([
    admin
      .from("notifications")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit),
    admin
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .is("read_at", null),
  ]);
  return { notifications: data || [], unreadCount: count || 0 };
}

export async function markNotificationsRead(userId: string, ids?: string[]) {
  let query = getSupabaseAdmin()
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", userId)
    .is("read_at", null);
  if (ids?.length) query = query.in("id", ids);
  const { error } = await query;
  if (error) throw error;
}

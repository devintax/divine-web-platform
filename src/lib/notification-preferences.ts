import "server-only";

import { getSupabaseAdmin } from "@/lib/supabase-admin";

export type NotificationPreferenceKey =
  | "email_on_message"
  | "email_on_update"
  | "email_on_complete"
  | "sms_on_message"
  | "sms_on_update";

const DEFAULTS: Record<NotificationPreferenceKey, boolean> = {
  email_on_message: true,
  email_on_update: true,
  email_on_complete: true,
  sms_on_message: true,
  sms_on_update: false,
};

export async function allowsNotificationPreference(params: {
  userId?: string | null;
  email?: string | null;
  key?: NotificationPreferenceKey;
  bypass?: boolean;
}) {
  if (params.bypass || !params.key) return true;
  const defaultValue = DEFAULTS[params.key];
  const admin = getSupabaseAdmin();

  try {
    let userId = params.userId || null;
    if (!userId && params.email) {
      const { data: profile } = await admin
        .from("user_profiles")
        .select("id")
        .eq("email", params.email.trim().toLowerCase())
        .single();
      userId = profile?.id || null;
    }
    if (!userId) return defaultValue;

    const { data: settings } = await admin
      .from("user_settings")
      .select(params.key)
      .eq("user_id", userId)
      .single();

    const row = settings as Record<string, unknown> | null;
    if (!row || typeof row[params.key] !== "boolean") return defaultValue;
    return row[params.key] !== false;
  } catch {
    return defaultValue;
  }
}

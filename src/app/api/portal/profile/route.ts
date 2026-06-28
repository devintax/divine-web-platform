import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth-server";
import { logAudit } from "@/lib/audit";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

const PROFILE_FIELDS = new Set([
  "legal_name",
  "phone",
  "business_name",
  "address",
  "address_line1",
  "address_line2",
  "city",
  "state",
  "zip",
  "zip_code",
]);

const SETTINGS_FIELDS = new Set([
  "email_on_message",
  "email_on_update",
  "email_on_complete",
  "sms_on_message",
  "sms_on_update",
  "timezone",
]);

export async function GET() {
  const session = await getAuthSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = getSupabaseAdmin();
  const { data: profile, error } = await admin
    .from("user_profiles")
    .select("id,auth_user_id,role,legal_name,email,phone,business_name,address,address_line1,address_line2,city,state,zip,zip_code,avatar_url,created_at,updated_at")
    .eq("id", session.profileId)
    .single();

  if (error || !profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

  const { data: settings } = await admin
    .from("user_settings")
    .select("email_on_message,email_on_update,email_on_complete,sms_on_message,sms_on_update,timezone,two_factor_enabled")
    .eq("user_id", session.profileId)
    .single();

  return NextResponse.json({
    ...profile,
    address: (profile as any).address || (profile as any).address_line1 || "",
    zip: (profile as any).zip || (profile as any).zip_code || "",
    settings: settings || defaultSettings(),
  });
}

export async function PATCH(req: NextRequest) {
  const session = await getAuthSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") return NextResponse.json({ error: "Invalid request body" }, { status: 400 });

  const profileUpdates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  for (const [key, value] of Object.entries(body as Record<string, unknown>)) {
    if (!PROFILE_FIELDS.has(key)) continue;
    profileUpdates[key] = typeof value === "string" ? value.trim() : value;
  }

  if (profileUpdates.address !== undefined) profileUpdates.address_line1 = profileUpdates.address;
  if (profileUpdates.zip !== undefined) profileUpdates.zip_code = profileUpdates.zip;

  const admin = getSupabaseAdmin();
  if (Object.keys(profileUpdates).length > 1) {
    const { error } = await admin.from("user_profiles").update(profileUpdates).eq("id", session.profileId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const incomingSettings = (body as any).settings;
  if (incomingSettings && typeof incomingSettings === "object") {
    const settingsUpdates: Record<string, unknown> = {
      user_id: session.profileId,
      updated_at: new Date().toISOString(),
    };
    for (const [key, value] of Object.entries(incomingSettings as Record<string, unknown>)) {
      if (!SETTINGS_FIELDS.has(key)) continue;
      settingsUpdates[key] = typeof value === "boolean" ? value : String(value || "").trim();
    }
    const { error } = await admin.from("user_settings").upsert(settingsUpdates, { onConflict: "user_id" });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await logAudit({
    userId: session.profileId,
    action: "profile_updated",
    resourceType: "user_profile",
    resourceId: session.profileId,
    eventCategory: "admin",
    metadata: { fields: Object.keys(profileUpdates).filter((key) => key !== "updated_at") },
  });

  return NextResponse.json({ success: true });
}

function defaultSettings() {
  return {
    email_on_message: true,
    email_on_update: true,
    email_on_complete: true,
    sms_on_message: true,
    sms_on_update: false,
    timezone: "America/New_York",
    two_factor_enabled: false,
  };
}

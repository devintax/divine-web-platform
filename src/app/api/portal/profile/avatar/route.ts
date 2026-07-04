import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth-server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { logAudit } from "@/lib/audit";

export const runtime = "nodejs";

const MAX_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

export async function POST(req: NextRequest) {
  const session = await getAuthSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await req.formData().catch(() => null);
  const file = formData?.get("avatar");
  if (!(file instanceof File)) return NextResponse.json({ error: "No avatar file provided" }, { status: 422 });
  if (!ALLOWED_TYPES.has(file.type)) return NextResponse.json({ error: "Avatar must be a JPG, PNG, WebP, or GIF image." }, { status: 422 });
  if (file.size > MAX_SIZE_BYTES) return NextResponse.json({ error: "Avatar must be 5MB or smaller." }, { status: 422 });

  const ext = extensionForMime(file.type);
  const storagePath = `${session.profileId}/avatar-${Date.now()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  const admin = getSupabaseAdmin();
  const bucket = admin.storage.from("avatars");

  const { error: uploadError } = await bucket.upload(storagePath, buffer, { contentType: file.type, upsert: true });
  if (uploadError) {
    console.error("[profile/avatar] upload failed:", uploadError);
    return NextResponse.json({ error: "Avatar upload failed. Please try again." }, { status: 500 });
  }

  const avatarUrl = bucket.getPublicUrl(storagePath);
  const { error: updateError } = await admin
    .from("user_profiles")
    .update({ avatar_url: avatarUrl, updated_at: new Date().toISOString() })
    .eq("id", session.profileId);
  if (updateError) return NextResponse.json({ error: updateError.message || "Profile update failed" }, { status: 500 });

  await logAudit({
    userId: session.profileId,
    action: "avatar_updated",
    resourceType: "user_profile",
    resourceId: session.profileId,
    eventCategory: "admin",
    metadata: { storagePath, mimeType: file.type, size: file.size },
  });

  return NextResponse.json({ success: true, avatarUrl });
}

export async function DELETE() {
  const session = await getAuthSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { error } = await getSupabaseAdmin()
    .from("user_profiles")
    .update({ avatar_url: null, updated_at: new Date().toISOString() })
    .eq("id", session.profileId);
  if (error) return NextResponse.json({ error: error.message || "Avatar could not be removed" }, { status: 500 });

  await logAudit({
    userId: session.profileId,
    action: "avatar_removed",
    resourceType: "user_profile",
    resourceId: session.profileId,
    eventCategory: "admin",
  });

  return NextResponse.json({ success: true, avatarUrl: null });
}

function extensionForMime(mimeType: string) {
  if (mimeType === "image/jpeg") return "jpg";
  if (mimeType === "image/png") return "png";
  if (mimeType === "image/webp") return "webp";
  return "gif";
}

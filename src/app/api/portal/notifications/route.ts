import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth-server";
import { listNotifications, markNotificationsRead } from "@/lib/notifications";

export async function GET() {
  const session = await getAuthSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json(await listNotifications(session.profileId));
}

export async function PATCH(req: NextRequest) {
  const session = await getAuthSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { ids } = await req.json().catch(() => ({}));
  await markNotificationsRead(session.profileId, Array.isArray(ids) ? ids : undefined);
  return NextResponse.json({ success: true });
}

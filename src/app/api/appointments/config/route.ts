import { NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth-server";

export async function GET() {
  const session = await getAuthSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  return NextResponse.json({
    calConfigured: Boolean(process.env.CAL_API_KEY),
    bookingUrlConfigured: Boolean(process.env.NEXT_PUBLIC_CAL_COM_URL),
    bookingUrl: process.env.NEXT_PUBLIC_CAL_COM_URL || null,
  });
}

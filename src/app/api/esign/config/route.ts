import { NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth-server";

export async function GET() {
  const session = await getAuthSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  return NextResponse.json({
    docusealConfigured: Boolean((process.env.DOCUSEAL_URL || process.env.DOCUSEAL_API_URL) && process.env.DOCUSEAL_API_KEY),
    docusealUrl: process.env.NEXT_PUBLIC_DOCUSEAL_URL || null,
  });
}

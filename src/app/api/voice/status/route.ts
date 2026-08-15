import { NextResponse } from "next/server";
import { verifyStaff } from "@/lib/auth-server";
import { checkDograhHealth } from "@/lib/voice/dograh";

export async function GET() {
  const session = await verifyStaff();
  if (!session) return NextResponse.json({ error: "Staff only" }, { status: 403 });

  return NextResponse.json({
    dograh: await checkDograhHealth(),
    businessHours: {
      start: Number(process.env.DFG_BUSINESS_HOURS_START || 9),
      end: Number(process.env.DFG_BUSINESS_HOURS_END || 18),
      timezone: "America/New_York",
    },
    phoneNumber: process.env.DFG_PHONE_NUMBER || "+13023225515",
  });
}

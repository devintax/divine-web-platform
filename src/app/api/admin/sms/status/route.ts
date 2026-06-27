import { NextResponse } from "next/server";
import { verifyStaff } from "@/lib/auth-server";
import { checkAllProviders } from "@/lib/sms";

export const runtime = "nodejs";

export async function GET() {
  const session = await verifyStaff();
  if (!session) return NextResponse.json({ error: "Staff access required" }, { status: 403 });
  const textBeeDeviceId = process.env.TEXTBEE_DEVICE_ID || "";
  const textBeeConfigured = Boolean(process.env.TEXTBEE_API_URL && process.env.TEXTBEE_API_KEY && textBeeDeviceId);

  return NextResponse.json({
    activeProvider: process.env.SMS_PROVIDER || "textbee",
    fallbackProvider: process.env.SMS_FALLBACK_PROVIDER || "vendel",
    providers: await checkAllProviders(),
    devices: {
      vendel: {
        deviceId: process.env.VENDEL_DEVICE_ID || "not set",
        deviceName: "FOXXD C10",
        devicePhone: "+13025226002",
        carrier: "T-Mobile",
      },
      textbee: {
        deviceId: textBeeDeviceId || "not set",
        deviceName: "FOXXD C10",
        carrier: "T-Mobile",
        fcmStatus: textBeeConfigured ? "checked-by-provider" : "device-id-missing",
      },
    },
  });
}

import { NextResponse } from "next/server";
import { verifyStaff } from "@/lib/auth-server";
import { can } from "@/lib/rbac/can";

const GROUPS = {
  sms: ["SMS_PROVIDER", "VENDEL_API_URL", "VENDEL_API_KEY", "VENDEL_DEVICE_ID", "TEXTBEE_API_URL", "TEXTBEE_API_KEY", "TEXTBEE_DEVICE_ID"],
  stripe: ["NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY", "STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET"],
  resend: ["RESEND_API_KEY", "RESEND_FROM_EMAIL", "RESEND_REPLY_TO"],
  temporal: ["TEMPORAL_ADDRESS", "TEMPORAL_NAMESPACE"],
  app: ["NEXT_PUBLIC_APP_URL", "NEXT_PUBLIC_INSFORGE_URL"],
} as const;

function statusFor(keys: readonly string[]) {
  const missing = keys.filter((key) => !process.env[key]?.trim());
  const dirty = keys.filter((key) => {
    const value = process.env[key];
    return value !== undefined && value !== value.trim();
  });
  return { configured: missing.length === 0 && dirty.length === 0, missing, dirty };
}

function insforgeAdminStatus() {
  const hasServiceKey = Boolean(process.env.INSFORGE_SERVICE_KEY?.trim());
  const dirty = ["INSFORGE_SERVICE_KEY"].filter((key) => {
    const value = process.env[key];
    return value !== undefined && value !== value.trim();
  });
  return {
    configured: hasServiceKey && dirty.length === 0,
    missing: hasServiceKey ? [] : ["INSFORGE_SERVICE_KEY"],
    dirty,
  };
}

export async function GET() {
  const session = await verifyStaff();
  if (!session || !can(session.role, "view_system_health_dashboard")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json({
    config: {
      ...Object.fromEntries(Object.entries(GROUPS).map(([name, keys]) => [name, statusFor(keys)])),
      insforgeAdmin: insforgeAdminStatus(),
    },
  });
}

import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { getAuthSession } from "@/lib/auth-server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { writeAuditLog } from "@/lib/audit";
import { isServiceType, SERVICE_WORKFLOW } from "@/lib/service-workflow";

export const runtime = "nodejs";

const SERVICE_PRICES: Record<string, number> = {
  tax: 29900,
  formation: 49900,
  insurance: 0,
  notary: 9900,
  bookkeeping: 19900,
};

function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) throw new Error("STRIPE_SECRET_KEY is not configured");
  return new Stripe(process.env.STRIPE_SECRET_KEY);
}

export async function POST(req: NextRequest) {
  const session = await getAuthSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!process.env.NEXT_PUBLIC_APP_URL) return NextResponse.json({ error: "NEXT_PUBLIC_APP_URL is not configured" }, { status: 500 });

  const { enrollmentId, serviceType } = await req.json().catch(() => ({}));
  if (!enrollmentId || !isServiceType(serviceType)) {
    return NextResponse.json({ error: "Valid enrollmentId and serviceType are required" }, { status: 422 });
  }

  const admin = getSupabaseAdmin();
  const { data: enrollment } = await admin
    .from("service_enrollments")
    .select("id,user_id,service_type,status")
    .eq("id", enrollmentId)
    .single();

  if (!enrollment || enrollment.user_id !== session.profileId || enrollment.service_type !== serviceType) {
    return NextResponse.json({ error: "Enrollment not found" }, { status: 404 });
  }

  const amount = SERVICE_PRICES[serviceType];
  if (amount === 0) {
    await admin
      .from("service_enrollments")
      .update({
        intake_data: { payment_required: false, payment_completed: true },
        updated_at: new Date().toISOString(),
      })
      .eq("id", enrollmentId);
    return NextResponse.json({ checkoutUrl: null, free: true });
  }

  const stripe = getStripe();
  const label = SERVICE_WORKFLOW[serviceType].label;
  const checkout = await stripe.checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card"],
    customer_email: session.email || undefined,
    line_items: [
      {
        price_data: {
          currency: "usd",
          unit_amount: amount,
          product_data: {
            name: `${label} - Divine Financial Group`,
            description: "622 E. Basin Road, Suite A, New Castle, DE 19720",
          },
        },
        quantity: 1,
      },
    ],
    metadata: {
      userId: session.profileId,
      enrollmentId,
      service: serviceType,
    },
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/portal/orders?payment=success&ref=${enrollmentId}`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/portal/orders?payment=cancelled&ref=${enrollmentId}`,
  });

  await writeAuditLog({
    userId: session.profileId,
    action: "checkout_session_created",
    resourceType: "enrollment",
    resourceId: enrollmentId,
    eventCategory: "billing",
    metadata: { serviceType, stripeSessionId: checkout.id, amount },
  });

  return NextResponse.json({ checkoutUrl: checkout.url, sessionId: checkout.id });
}

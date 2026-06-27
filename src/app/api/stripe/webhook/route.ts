import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { writeAuditLog } from "@/lib/audit";
import { SIGNALS, signalWorkflow, workflowId } from "@/lib/staff/signal";

export const runtime = "nodejs";

function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) throw new Error("STRIPE_SECRET_KEY is not configured");
  return new Stripe(process.env.STRIPE_SECRET_KEY);
}

export async function POST(req: NextRequest) {
  let event: Stripe.Event;
  const rawBody = await req.text();
  const signature = req.headers.get("stripe-signature");

  try {
    const stripe = getStripe();
    if (process.env.STRIPE_WEBHOOK_SECRET && signature) {
      event = stripe.webhooks.constructEvent(rawBody, signature, process.env.STRIPE_WEBHOOK_SECRET);
    } else if (process.env.NODE_ENV !== "production") {
      event = JSON.parse(rawBody) as Stripe.Event;
    } else {
      return NextResponse.json({ error: "Webhook signature required" }, { status: 400 });
    }
  } catch (error) {
    console.error("[stripe/webhook]", error);
    return NextResponse.json({ error: "Webhook verification failed" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const enrollmentId = session.metadata?.enrollmentId;
    const userId = session.metadata?.userId;
    const service = session.metadata?.service;

    if (enrollmentId && service) {
      const admin = getSupabaseAdmin();
      const { data: enrollment } = await admin.from("service_enrollments").select("intake_data").eq("id", enrollmentId).single();
      await admin.from("service_enrollments").update({
        intake_data: {
          ...((enrollment?.intake_data as Record<string, unknown>) || {}),
          payment_completed: true,
          stripe_session: session.id,
          stripe_amount_total: session.amount_total,
        },
        updated_at: new Date().toISOString(),
      }).eq("id", enrollmentId);

      try {
        await signalWorkflow(workflowId(service, enrollmentId), SIGNALS.PAYMENT_COMPLETED, session.id);
      } catch (signalError) {
        console.warn("[stripe/webhook] Temporal signal skipped", signalError);
      }

      await writeAuditLog({
        userId,
        action: "payment_completed",
        resourceType: "enrollment",
        resourceId: enrollmentId,
        eventCategory: "billing",
        metadata: { stripeSessionId: session.id, service, amount: session.amount_total },
      });
    }
  }

  return NextResponse.json({ received: true });
}

import { getSupabaseAdmin } from "../lib/insforge";
import Stripe from 'stripe';

function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) throw new Error('STRIPE_SECRET_KEY is not set');
  return new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2025-05-01' as any });
}

export async function createStripePaymentLink(params: {
  service: string; amount: number; userId: string; enrollmentId: string; description: string;
}): Promise<string> {
  const stripe = getStripe();
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: [{
      price_data: {
        currency: 'usd',
        product_data: { name: `Divine Financial Group — ${params.service}`, description: params.description },
        unit_amount: params.amount,
      },
      quantity: 1,
    }],
    mode: 'payment',
    success_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/portal/dashboard?payment=success&enrollment=${params.enrollmentId}`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/portal/dashboard?payment=cancelled`,
    metadata: { userId: params.userId, enrollmentId: params.enrollmentId, service: params.service },
  });
  return session.url!;
}

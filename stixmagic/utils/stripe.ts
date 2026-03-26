import Stripe from "stripe";

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error("STRIPE_SECRET_KEY environment variable is required");
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2023-10-16",
});

const PLAN_PRICE_MAP: Record<string, string | undefined> = {
  premium: process.env.STRIPE_PRICE_PREMIUM,
  pro: process.env.STRIPE_PRICE_PRO,
};

/**
 * Creates a Stripe Checkout Session for a subscription plan.
 * Returns the checkout URL.
 */
export async function createCheckoutSession(
  telegramId: number,
  plan: string
): Promise<string> {
  const priceId = PLAN_PRICE_MAP[plan.toLowerCase()];
  if (!priceId) {
    throw new Error(`Unknown plan or missing price ID for plan: ${plan}`);
  }

  const baseUrl = process.env.APP_BASE_URL ?? "http://localhost:3000";

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    payment_method_types: ["card"],
    line_items: [{ price: priceId, quantity: 1 }],
    metadata: {
      telegram_id: String(telegramId),
      plan,
    },
    success_url: `${baseUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${baseUrl}/checkout/cancel`,
  });

  if (!session.url) {
    throw new Error("Stripe did not return a checkout URL");
  }

  return session.url;
}

/**
 * Constructs and verifies a Stripe webhook event.
 */
export function constructWebhookEvent(
  payload: Buffer,
  signature: string
): Stripe.Event {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    throw new Error("STRIPE_WEBHOOK_SECRET environment variable is required");
  }
  return stripe.webhooks.constructEvent(payload, signature, webhookSecret);
}

import type { Express, Request, Response } from "express";
import Stripe from "stripe";
import { storage } from "./storage";

const PLAN_PRICE_IDS: Record<string, string | undefined> = {
  premium: process.env.STRIPE_PRICE_PREMIUM,
  pro: process.env.STRIPE_PRICE_PRO,
};

function getStripeClient(): Stripe {
  const secret = process.env.STRIPE_SECRET_KEY;
  if (!secret) {
    throw new Error("STRIPE_SECRET_KEY is not configured");
  }
  return new Stripe(secret);
}

export function registerSubscriptionRoutes(app: Express): void {
  /**
   * POST /api/user
   * Creates a new subscription user from Telegram.
   * Body: { telegram_id: string, telegram_username?: string }
   */
  app.post("/api/user", async (req: Request, res: Response) => {
    try {
      const { telegram_id, telegram_username } = req.body as {
        telegram_id?: string;
        telegram_username?: string;
      };

      if (!telegram_id) {
        return res.status(400).json({ error: "telegram_id is required" });
      }

      // Return existing user if already registered
      let user = await storage.getTelegramUser(telegram_id);
      if (!user) {
        user = await storage.createTelegramUser({
          telegramId: telegram_id,
          username: telegram_username ?? null,
          firstName: null,
          lastName: null,
          isActive: true,
          plan: "free",
          subscriptionStatus: "inactive",
        });
      }

      res.json({
        id: user.id,
        telegram_id: user.telegramId,
        telegram_username: user.username,
        plan: user.plan ?? "free",
        subscription_status: user.subscriptionStatus ?? "inactive",
        created_at: user.joinedAt,
        updated_at: user.updatedAt,
      });
    } catch (error: any) {
      res.status(500).json({ error: `Failed to create user: ${error.message}` });
    }
  });

  /**
   * GET /api/user/:telegram_id
   * Returns the subscription user record for a given Telegram ID.
   */
  app.get("/api/user/:telegram_id", async (req: Request, res: Response) => {
    try {
      const { telegram_id } = req.params;
      const user = await storage.getTelegramUser(telegram_id);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      res.json({
        id: user.id,
        telegram_id: user.telegramId,
        telegram_username: user.username,
        plan: user.plan ?? "free",
        subscription_status: user.subscriptionStatus ?? "inactive",
        created_at: user.joinedAt,
        updated_at: user.updatedAt,
      });
    } catch (error: any) {
      res.status(500).json({ error: `Failed to fetch user: ${error.message}` });
    }
  });

  /**
   * POST /api/subscription/create-checkout
   * Creates a Stripe Checkout Session for a subscription upgrade.
   * Body: { telegram_id: string, plan: "premium" | "pro" }
   */
  app.post("/api/subscription/create-checkout", async (req: Request, res: Response) => {
    try {
      const { telegram_id, plan } = req.body as { telegram_id?: string; plan?: string };

      if (!telegram_id || !plan) {
        return res.status(400).json({ error: "telegram_id and plan are required" });
      }

      if (!["premium", "pro"].includes(plan)) {
        return res.status(400).json({ error: "plan must be 'premium' or 'pro'" });
      }

      const priceId = PLAN_PRICE_IDS[plan];
      if (!priceId) {
        return res.status(500).json({ error: `Stripe price not configured for plan: ${plan}` });
      }

      // Ensure the user exists (create if needed)
      let user = await storage.getTelegramUser(telegram_id);
      if (!user) {
        user = await storage.createTelegramUser({
          telegramId: telegram_id,
          username: null,
          firstName: null,
          lastName: null,
          isActive: true,
          plan: "free",
          subscriptionStatus: "inactive",
        });
      }

      const stripe = getStripeClient();
      const baseUrl = process.env.APP_BASE_URL || "https://stixmagic.com";

      const session = await stripe.checkout.sessions.create({
        mode: "subscription",
        line_items: [{ price: priceId, quantity: 1 }],
        success_url: `${baseUrl}/upgrade/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${baseUrl}/upgrade/cancel`,
        metadata: {
          telegram_id,
          plan,
          user_id: String(user.id),
        },
      });

      res.json({ url: session.url, session_id: session.id });
    } catch (error: any) {
      console.error("Stripe checkout error:", error);
      res.status(500).json({ error: error.message || "Failed to create checkout session" });
    }
  });

  /**
   * POST /api/subscription/webhook
   * Handles Stripe webhook events to update user plan and subscription status.
   * Note: this route receives raw body (configured in server/index.ts before express.json()).
   */
  app.post("/api/subscription/webhook", async (req: Request, res: Response) => {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    let event: Stripe.Event;

    try {
      const stripe = getStripeClient();

      if (webhookSecret) {
        const sig = req.headers["stripe-signature"] as string;
        event = stripe.webhooks.constructEvent(req.body as Buffer, sig, webhookSecret);
      } else {
        // Fallback for development without webhook secret
        event = JSON.parse(req.body.toString()) as Stripe.Event;
      }
    } catch (err: any) {
      console.error("Stripe webhook signature error:", err.message);
      return res.status(400).json({ error: `Webhook Error: ${err.message}` });
    }

    try {
      await handleStripeEvent(event);
      res.json({ received: true });
    } catch (err: any) {
      console.error("Stripe webhook processing error:", err.message);
      res.status(500).json({ error: "Failed to process webhook event" });
    }
  });
}

async function handleStripeEvent(event: Stripe.Event): Promise<void> {
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const telegramId = session.metadata?.telegram_id;
      const plan = session.metadata?.plan;
      const subscriptionId = session.subscription as string | null;

      if (!telegramId || !plan || !subscriptionId) break;

      // Update user plan and subscription status
      await storage.updateTelegramUser(telegramId, {
        plan,
        subscriptionStatus: "active",
        updatedAt: new Date(),
      });

      // Upsert subscription record
      const userId = parseInt(session.metadata?.user_id || "0", 10);
      if (!userId) {
        console.error(`checkout.session.completed: missing user_id in metadata for session ${session.id}`);
        break;
      }

      const existing = await storage.getSubscriptionByProviderId(subscriptionId);

      if (!existing) {
        await storage.createSubscription({
          userId,
          plan,
          provider: "stripe",
          providerSubscriptionId: subscriptionId,
          status: "active",
          renewalDate: null,
        });
      } else {
        await storage.updateSubscription(subscriptionId, { status: "active", plan });
      }

      console.log(`✅ Subscription activated: telegram_id=${telegramId}, plan=${plan}`);
      break;
    }

    case "customer.subscription.updated": {
      const sub = event.data.object as Stripe.Subscription;
      const providerSubId = sub.id;
      const status = mapStripeStatus(sub.status);

      await storage.updateSubscription(providerSubId, {
        status,
        renewalDate: sub.current_period_end ? new Date(sub.current_period_end * 1000) : null,
      });

      // Update telegramUser status if we can resolve the user
      const storedSub = await storage.getSubscriptionByProviderId(providerSubId);
      if (storedSub) {
        const user = await storage.getTelegramUserById(storedSub.userId);
        if (user) {
          await storage.updateTelegramUser(user.telegramId, {
            subscriptionStatus: status,
            updatedAt: new Date(),
          });
        }
        console.log(`🔄 Subscription updated: id=${providerSubId}, status=${status}`);
      }
      break;
    }

    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      const providerSubId = sub.id;

      await storage.updateSubscription(providerSubId, { status: "cancelled" });

      // Downgrade user to free plan
      const storedSub = await storage.getSubscriptionByProviderId(providerSubId);
      if (storedSub) {
        const user = await storage.getTelegramUserById(storedSub.userId);
        if (user) {
          await storage.updateTelegramUser(user.telegramId, {
            plan: "free",
            subscriptionStatus: "cancelled",
            updatedAt: new Date(),
          });
        }
        console.log(`❌ Subscription cancelled: id=${providerSubId}`);
      }
      break;
    }

    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice;
      const subscriptionId = invoice.subscription as string | null;
      if (subscriptionId) {
        await storage.updateSubscription(subscriptionId, { status: "past_due" });
        console.log(`⚠️ Payment failed for subscription: ${subscriptionId}`);
      }
      break;
    }

    default:
      // Unhandled event type — silently ignore
      break;
  }
}

function mapStripeStatus(stripeStatus: Stripe.Subscription.Status): string {
  switch (stripeStatus) {
    case "active":
    case "trialing":
      return "active";
    case "canceled":
      return "cancelled";
    case "past_due":
    case "unpaid":
      return "past_due";
    default:
      return "inactive";
  }
}

import type { Express, Request, Response } from "express";
import Stripe from "stripe";
import { storage } from "./storage";
import { getUserEntitlement } from "./entitlements";

// ─── Stripe helpers ────────────────────────────────────────────────────────────

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

// ─── Input validation helpers ──────────────────────────────────────────────────

/** Validate that telegram_id is a non-empty numeric string to prevent spoofing */
function isValidTelegramId(value: unknown): value is string {
  if (typeof value !== "string" || value.trim() === "") return false;
  return /^\d+$/.test(value.trim());
}

// ─── Route registration ────────────────────────────────────────────────────────

export function registerSubscriptionRoutes(app: Express): void {
  app.post("/api/user", async (req: Request, res: Response) => {
    try {
      const { telegram_id, telegram_username } = req.body as {
        telegram_id?: string;
        telegram_username?: string;
      };

      if (!telegram_id) {
        return res.status(400).json({ error: "telegram_id is required" });
      }

      if (!isValidTelegramId(telegram_id)) {
        console.warn(`[abuse] POST /api/user rejected non-numeric telegram_id: "${telegram_id}" from ${req.ip}`);
        return res.status(400).json({ error: "telegram_id must be a numeric string" });
      }

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
        console.log(`[user] Created account for telegram_id=${telegram_id}`);
      }

      res.json(serializeUser(user));
    } catch (error: any) {
      console.error("[user] POST /api/user error:", error.message);
      res.status(500).json({ error: `Failed to create user: ${error.message}` });
    }
  });

  app.get("/api/user/:telegram_id", async (req: Request, res: Response) => {
    try {
      const { telegram_id } = req.params;
      const user = await storage.getTelegramUser(telegram_id);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      res.json(serializeUser(user));
    } catch (error: any) {
      res.status(500).json({ error: `Failed to fetch user: ${error.message}` });
    }
  });

  app.post("/api/subscription/create-checkout", async (req: Request, res: Response) => {
    try {
      const { telegram_id, plan } = req.body as { telegram_id?: string; plan?: string };

      if (!telegram_id || !plan) {
        return res.status(400).json({ error: "telegram_id and plan are required" });
      }

      if (!isValidTelegramId(telegram_id)) {
        console.warn(`[abuse] POST /api/subscription/create-checkout rejected telegram_id: "${telegram_id}" from ${req.ip}`);
        return res.status(400).json({ error: "telegram_id must be a numeric string" });
      }

      if (!["premium", "pro"].includes(plan)) {
        return res.status(400).json({ error: "plan must be 'premium' or 'pro'" });
      }

      const priceId = PLAN_PRICE_IDS[plan];
      if (!priceId) {
        return res.status(500).json({ error: `Stripe price not configured for plan: ${plan}` });
      }

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

      console.log(`[checkout] Session created for telegram_id=${telegram_id}, plan=${plan}`);
      res.json({ url: session.url, session_id: session.id });
    } catch (error: any) {
      console.error("[checkout] Stripe checkout error:", error);
      res.status(500).json({ error: error.message || "Failed to create checkout session" });
    }
  });

  /**
   * POST /api/subscription/webhook
   * Raw body is ensured by express.raw() mounted in server/index.ts before express.json().
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
        event = JSON.parse(req.body.toString()) as Stripe.Event;
      }
    } catch (err: any) {
      console.error("[webhook] Stripe signature error:", err.message);
      return res.status(400).json({ error: `Webhook Error: ${err.message}` });
    }

    // Idempotency: reject already-processed events
    const alreadyProcessed = await storage.hasStripeEvent(event.id);
    if (alreadyProcessed) {
      console.log(`[webhook] Duplicate event ignored: ${event.id} (${event.type})`);
      return res.json({ received: true, duplicate: true });
    }

    try {
      await handleStripeEvent(event);
      await storage.recordStripeEvent({ eventId: event.id, type: event.type, processed: true });
      res.json({ received: true });
    } catch (err: any) {
      console.error("[webhook] Processing error:", err.message);
      await storage.recordStripeEvent({ eventId: event.id, type: event.type, processed: false }).catch(() => {});
      res.status(500).json({ error: "Failed to process webhook event" });
    }
  });

  /**
   * GET /api/admin/user/:telegram_id
   * Debug endpoint returning user + subscription + entitlement.
   * Disabled via ADMIN_API_ENABLED=false environment variable.
   * Extension point: add auth middleware before enabling in production.
   */
  app.get("/api/admin/user/:telegram_id", async (req: Request, res: Response) => {
    const adminEnabled = process.env.ADMIN_API_ENABLED !== "false";
    if (!adminEnabled) {
      return res.status(403).json({ error: "Admin API is disabled" });
    }

    try {
      const { telegram_id } = req.params;
      const user = await storage.getTelegramUser(telegram_id);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      const subscription = await storage.getSubscriptionByUserId(user.id);
      const entitlement = getUserEntitlement(user);

      res.json({
        user: serializeUser(user),
        subscription: subscription ?? null,
        entitlement,
      });
    } catch (error: any) {
      res.status(500).json({ error: `Failed to fetch admin user data: ${error.message}` });
    }
  });
}

// ─── Stripe event handler ──────────────────────────────────────────────────────

async function handleStripeEvent(event: Stripe.Event): Promise<void> {
  console.log(`[webhook] Processing ${event.type} (${event.id})`);

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const telegramId = session.metadata?.telegram_id;
      const plan = session.metadata?.plan;
      const subscriptionId = session.subscription as string | null;

      if (!telegramId || !plan || !subscriptionId) {
        console.error(`[webhook] checkout.session.completed missing metadata: ${session.id}`);
        break;
      }

      const userId = parseInt(session.metadata?.user_id || "0", 10);
      if (!userId) {
        console.error(`[webhook] checkout.session.completed missing user_id: ${session.id}`);
        break;
      }

      // Fetch full subscription details from Stripe
      const stripe = getStripeClient();
      const stripeSub = await stripe.subscriptions.retrieve(subscriptionId);
      const priceId = stripeSub.items.data[0]?.price?.id ?? null;
      const customerId = typeof stripeSub.customer === "string"
        ? stripeSub.customer
        : (stripeSub.customer as Stripe.Customer | Stripe.DeletedCustomer)?.id ?? null;
      const periodEnd = stripeSub.current_period_end ? new Date(stripeSub.current_period_end * 1000) : null;

      // Update user entitlement snapshot
      await storage.updateTelegramUser(telegramId, {
        plan,
        subscriptionStatus: "active",
        updatedAt: new Date(),
      });

      // Upsert subscription record
      const existing = await storage.getSubscriptionByProviderId(subscriptionId);
      if (!existing) {
        await storage.createSubscription({
          userId,
          plan,
          provider: "stripe",
          providerSubscriptionId: subscriptionId,
          stripeCustomerId: customerId,
          providerPriceId: priceId,
          status: "active",
          renewalDate: periodEnd,
          currentPeriodEnd: periodEnd,
          cancelAtPeriodEnd: stripeSub.cancel_at_period_end ?? false,
        });
      } else {
        await storage.updateSubscription(subscriptionId, {
          status: "active",
          plan,
          stripeCustomerId: customerId ?? existing.stripeCustomerId,
          providerPriceId: priceId ?? existing.providerPriceId,
          currentPeriodEnd: periodEnd,
          cancelAtPeriodEnd: stripeSub.cancel_at_period_end ?? false,
        });
      }

      console.log(`[webhook] ✅ checkout.session.completed: telegram_id=${telegramId}, plan=${plan}`);
      break;
    }

    case "customer.subscription.created": {
      // Fires alongside checkout.session.completed — sync if local record exists
      const sub = event.data.object as Stripe.Subscription;
      const existing = await storage.getSubscriptionByProviderId(sub.id);
      if (existing) {
        await syncSubscriptionFromStripe(sub);
      }
      console.log(`[webhook] customer.subscription.created: ${sub.id} (synced=${!!existing})`);
      break;
    }

    case "customer.subscription.updated": {
      const sub = event.data.object as Stripe.Subscription;
      await syncSubscriptionFromStripe(sub);
      console.log(`[webhook] 🔄 customer.subscription.updated: id=${sub.id}, status=${sub.status}`);
      break;
    }

    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      const providerSubId = sub.id;

      await storage.updateSubscription(providerSubId, { status: "cancelled" });

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
      }
      console.log(`[webhook] ❌ customer.subscription.deleted: id=${providerSubId}`);
      break;
    }

    case "invoice.payment_succeeded": {
      const invoice = event.data.object as Stripe.Invoice;
      const subscriptionId = invoice.subscription as string | null;
      if (!subscriptionId) break;

      await storage.updateSubscription(subscriptionId, { status: "active" });

      const storedSub = await storage.getSubscriptionByProviderId(subscriptionId);
      if (storedSub) {
        const user = await storage.getTelegramUserById(storedSub.userId);
        if (user && user.subscriptionStatus === "past_due") {
          await storage.updateTelegramUser(user.telegramId, {
            subscriptionStatus: "active",
            updatedAt: new Date(),
          });
        }
      }
      console.log(`[webhook] ✅ invoice.payment_succeeded for subscription: ${subscriptionId}`);
      break;
    }

    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice;
      const subscriptionId = invoice.subscription as string | null;
      if (!subscriptionId) break;

      await storage.updateSubscription(subscriptionId, { status: "past_due" });

      const storedSub = await storage.getSubscriptionByProviderId(subscriptionId);
      if (storedSub) {
        const user = await storage.getTelegramUserById(storedSub.userId);
        if (user) {
          await storage.updateTelegramUser(user.telegramId, {
            subscriptionStatus: "past_due",
            updatedAt: new Date(),
          });
        }
      }
      console.log(`[webhook] ⚠️ invoice.payment_failed for subscription: ${subscriptionId}`);
      break;
    }

    default:
      break;
  }
}

/**
 * Sync a Stripe subscription object into local storage, updating both the
 * subscriptions table and the user entitlement snapshot.
 */
async function syncSubscriptionFromStripe(sub: Stripe.Subscription): Promise<void> {
  const providerSubId = sub.id;
  const status = mapStripeStatus(sub.status);
  const priceId = sub.items.data[0]?.price?.id ?? null;
  const customerId = typeof sub.customer === "string"
    ? sub.customer
    : (sub.customer as Stripe.Customer | Stripe.DeletedCustomer)?.id ?? null;
  const periodEnd = sub.current_period_end ? new Date(sub.current_period_end * 1000) : null;

  await storage.updateSubscription(providerSubId, {
    status,
    renewalDate: periodEnd,
    currentPeriodEnd: periodEnd,
    cancelAtPeriodEnd: sub.cancel_at_period_end ?? false,
    ...(customerId && { stripeCustomerId: customerId }),
    ...(priceId && { providerPriceId: priceId }),
  });

  const storedSub = await storage.getSubscriptionByProviderId(providerSubId);
  if (!storedSub) return;

  const user = await storage.getTelegramUserById(storedSub.userId);
  if (!user) return;

  const updates: Partial<import("@shared/schema").TelegramUser> = {
    subscriptionStatus: status as import("@shared/schema").SubscriptionStatus,
    updatedAt: new Date(),
  };

  // Downgrade plan to free when subscription is no longer active
  if (status === "cancelled" || status === "inactive") {
    updates.plan = "free" as import("@shared/schema").SubscriptionPlan;
  }

  await storage.updateTelegramUser(user.telegramId, updates);
}

// ─── Status mapping ────────────────────────────────────────────────────────────

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

// ─── Response serializer ───────────────────────────────────────────────────────

function serializeUser(user: import("@shared/schema").TelegramUser) {
  return {
    id: user.id,
    telegram_id: user.telegramId,
    telegram_username: user.username,
    plan: user.plan ?? "free",
    subscription_status: user.subscriptionStatus ?? "inactive",
    created_at: user.joinedAt,
    updated_at: user.updatedAt,
  };
}

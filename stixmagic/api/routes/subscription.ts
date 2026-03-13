import { Router, Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { getUserByTelegramId, updateUserPlan } from "../../services/userService.js";
import {
  activateUserSubscription,
  cancelSubscriptionByProviderId,
} from "../../services/subscriptionService.js";
import {
  createCheckoutSession,
  constructWebhookEvent,
} from "../../utils/stripe.js";
import Stripe from "stripe";

const prisma = new PrismaClient();

const router = Router();

/**
 * POST /api/subscription/create-checkout
 * Creates a Stripe Checkout Session and returns the URL.
 */
router.post("/create-checkout", async (req: Request, res: Response) => {
  const { telegram_id, plan } = req.body as {
    telegram_id?: number;
    plan?: string;
  };

  if (!telegram_id || !plan) {
    res.status(400).json({ error: "telegram_id and plan are required" });
    return;
  }

  const allowedPlans = ["premium", "pro"];
  if (!allowedPlans.includes(plan.toLowerCase())) {
    res.status(400).json({ error: `Plan must be one of: ${allowedPlans.join(", ")}` });
    return;
  }

  try {
    const url = await createCheckoutSession(telegram_id, plan);
    res.json({ url });
  } catch (error) {
    console.error("Error creating checkout session:", error);
    res.status(500).json({ error: "Failed to create checkout session" });
  }
});

/**
 * POST /api/subscription/stars-payment
 * Records a successful Telegram Stars payment sent from the bot.
 *
 * Body: { telegram_id, plan, telegram_payment_charge_id }
 */
router.post("/stars-payment", async (req: Request, res: Response) => {
  const { telegram_id, plan, telegram_payment_charge_id } = req.body as {
    telegram_id?: number;
    plan?: string;
    telegram_payment_charge_id?: string;
  };

  if (!telegram_id || !plan || !telegram_payment_charge_id) {
    res.status(400).json({
      error: "telegram_id, plan, and telegram_payment_charge_id are required",
    });
    return;
  }

  const allowedPlans = ["premium", "pro"];
  if (!allowedPlans.includes(plan.toLowerCase())) {
    res.status(400).json({ error: `Plan must be one of: ${allowedPlans.join(", ")}` });
    return;
  }

  try {
    const user = await getUserByTelegramId(telegram_id);
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    // Grant 30 days of access from now
    const renewalDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    await activateUserSubscription(
      telegram_id,
      user.id,
      plan,
      telegram_payment_charge_id,
      renewalDate,
      "telegram_stars"
    );

    res.json({
      success: true,
      plan,
      renewal_date: renewalDate.toISOString(),
    });
  } catch (error) {
    console.error("Error recording Stars payment:", error);
    res.status(500).json({ error: "Failed to record Stars payment" });
  }
});

/**
 * POST /api/subscription/webhook
 * Handles Stripe webhook events.
 * Requires raw body — set up in server.ts before JSON middleware.
 */
router.post(
  "/webhook",
  async (req: Request & { rawBody?: Buffer }, res: Response) => {
    const signature = req.headers["stripe-signature"] as string;

    if (!signature) {
      res.status(400).json({ error: "Missing stripe-signature header" });
      return;
    }

    let event: Stripe.Event;
    try {
      event = constructWebhookEvent(req.rawBody as Buffer, signature);
    } catch (err) {
      console.error("Webhook signature verification failed:", err);
      res.status(400).json({ error: "Webhook signature verification failed" });
      return;
    }

    try {
      switch (event.type) {
        case "checkout.session.completed": {
          const session = event.data.object as Stripe.Checkout.Session;
          const telegramId = Number(session.metadata?.telegram_id);
          const plan = session.metadata?.plan ?? "premium";
          const subscriptionId =
            typeof session.subscription === "string"
              ? session.subscription
              : (session.subscription?.id ?? "");

          if (telegramId) {
            const user = await getUserByTelegramId(telegramId);
            if (user) {
              const renewalDate = session.expires_at
                ? new Date(session.expires_at * 1000)
                : undefined;
              await activateUserSubscription(
                telegramId,
                user.id,
                plan,
                subscriptionId,
                renewalDate
              );
            }
          }
          break;
        }

        case "invoice.paid": {
          const invoice = event.data.object as Stripe.Invoice;
          const subscriptionId =
            typeof invoice.subscription === "string"
              ? invoice.subscription
              : (invoice.subscription?.id ?? "");

          if (subscriptionId) {
            // Ensure subscription stays active on renewal
            await prisma.subscription.updateMany({
              where: { provider_subscription_id: subscriptionId },
              data: { status: "active" },
            });
          }
          break;
        }

        case "customer.subscription.deleted": {
          const subscription = event.data.object as Stripe.Subscription;
          await cancelSubscriptionByProviderId(subscription.id);

          // Find user via subscription record and reset their plan
          const sub = await prisma.subscription.findFirst({
            where: { provider_subscription_id: subscription.id },
            include: { user: true },
          });
          if (sub) {
            await updateUserPlan(
              Number(sub.user.telegram_id),
              "free",
              "inactive"
            );
          }
          break;
        }

        default:
          // Unhandled event type — acknowledge receipt
          break;
      }

      res.json({ received: true });
    } catch (error) {
      console.error("Error processing webhook event:", error);
      res.status(500).json({ error: "Webhook processing failed" });
    }
  }
);

export default router;

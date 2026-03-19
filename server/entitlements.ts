import type { TelegramUser } from "@shared/schema";
import type { SubscriptionPlan, SubscriptionStatus } from "@shared/schema";

export interface Entitlement {
  plan: SubscriptionPlan;
  subscriptionStatus: SubscriptionStatus;
  /** True when the user has an active premium or pro subscription */
  isPremium: boolean;
  /** True when the user has an active pro subscription */
  isPro: boolean;
}

/**
 * Derive a user's current feature entitlement from their database record.
 *
 * This is the single source of truth for feature gating.
 * All plan checks in the application should call this function rather than
 * reading `user.plan` directly, to keep gating logic in one place.
 *
 * @example
 * ```ts
 * const ent = getUserEntitlement(user);
 * if (ent.isPremium) { // unlock advanced tools }
 * if (ent.isPro)     { // unlock everything     }
 * ```
 */
export function getUserEntitlement(user: TelegramUser): Entitlement {
  const plan = (user.plan ?? "free") as SubscriptionPlan;
  const subscriptionStatus = (user.subscriptionStatus ?? "inactive") as SubscriptionStatus;

  // A user is considered active when their subscription is in one of these states.
  // "cancelled" is intentionally excluded — a cancelled subscription means access
  // has ended (or will end at period end), so we do not grant paid-plan features.
  const isActive = subscriptionStatus === "active";

  return {
    plan,
    subscriptionStatus,
    isPremium: isActive && (plan === "premium" || plan === "pro"),
    isPro: isActive && plan === "pro",
  };
}

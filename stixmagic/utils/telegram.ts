/**
 * Represents the shape of a user as returned by the database.
 */
export interface UserLike {
  plan: string;
  subscription_status: string;
}

type Feature =
  | "basic_stickers"
  | "advanced_stickers"
  | "custom_stickers"
  | "ai_generation"
  | "unlimited_packs";

const PLAN_FEATURES: Record<string, Feature[]> = {
  free: ["basic_stickers"],
  premium: ["basic_stickers", "advanced_stickers", "custom_stickers"],
  pro: [
    "basic_stickers",
    "advanced_stickers",
    "custom_stickers",
    "ai_generation",
    "unlimited_packs",
  ],
};

/**
 * Returns true if the user's current plan grants access to the given feature.
 *
 * free     → limited features (basic_stickers only)
 * premium  → advanced features
 * pro      → all features unlocked
 */
export function canUseFeature(user: UserLike, feature: Feature): boolean {
  const allowedFeatures = PLAN_FEATURES[user.plan.toLowerCase()] ?? [];
  return allowedFeatures.includes(feature);
}

/**
 * Returns the display name for a plan.
 */
export function getPlanDisplayName(plan: string): string {
  const names: Record<string, string> = {
    free: "Free",
    premium: "Premium",
    pro: "Pro",
  };
  return names[plan.toLowerCase()] ?? plan;
}

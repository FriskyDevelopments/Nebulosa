/**
 * Parses a star price from a string env var, falling back to `defaultValue`.
 * Returns the default if the value is missing, non-numeric, or not a positive integer.
 */
function parseStarPrice(envValue: string | undefined, defaultValue: number): number {
  if (!envValue) return defaultValue;
  const parsed = parseInt(envValue, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : defaultValue;
}

/**
 * Star prices for each plan (Telegram Stars / XTR currency).
 *
 * Set STARS_PRICE_PREMIUM and STARS_PRICE_PRO in your .env to override defaults.
 * Prices represent the number of stars charged for 30 days of access.
 */
export const STAR_PRICES: Record<string, number> = {
  premium: parseStarPrice(process.env.STARS_PRICE_PREMIUM, 75),
  pro: parseStarPrice(process.env.STARS_PRICE_PRO, 200),
};

/**
 * Returns the star price for a given plan, or throws if the plan is unknown.
 */
export function getStarPrice(plan: string): number {
  const price = STAR_PRICES[plan.toLowerCase()];
  if (price === undefined) {
    throw new Error(`No star price configured for plan: ${plan}`);
  }
  return price;
}

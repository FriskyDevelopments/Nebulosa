import { pgTable, text, serial, integer, boolean, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

// Subscription plan enum: free | premium | pro
export const planEnum = pgEnum("plan", ["free", "premium", "pro"]);
export type SubscriptionPlan = "free" | "premium" | "pro";

// Subscription status enum: inactive | active | cancelled | past_due
export const subscriptionStatusEnum = pgEnum("subscription_status", ["inactive", "active", "cancelled", "past_due"]);
export type SubscriptionStatus = "inactive" | "active" | "cancelled" | "past_due";

export const telegramUsers = pgTable("telegram_users", {
  id: serial("id").primaryKey(),
  telegramId: text("telegram_id").notNull().unique(),
  username: text("username"),
  firstName: text("first_name"),
  lastName: text("last_name"),
  isActive: boolean("is_active").default(true),
  /** Current entitlement snapshot — updated by webhook after payment events */
  plan: planEnum("plan").notNull().default("free"),
  /** Subscription billing state — mirrors the active Stripe subscription status */
  subscriptionStatus: subscriptionStatusEnum("subscription_status").notNull().default("inactive"),
  joinedAt: timestamp("joined_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  // ─── Token system (NOT YET IMPLEMENTED) ─────────────────────────────────────
  // These fields are reserved for a future token phase.
  // When implemented, each plan will grant a monthly token allowance.
  //   free    → 100 tokens/month
  //   premium → 1,000 tokens/month
  //   pro     → 5,000 tokens/month
  /** Reserved: monthly token grant for this plan tier (tokens not yet active) */
  monthlyTokenAllowance: integer("monthly_token_allowance").default(0),
  /** Reserved: current token balance for this user (tokens not yet active) */
  tokenBalance: integer("token_balance").default(0),
});

// Subscriptions table for Stripe subscription records
export const subscriptions = pgTable("subscriptions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => telegramUsers.id),
  plan: planEnum("plan").notNull(),
  provider: text("provider").notNull().default("stripe"),
  providerSubscriptionId: text("provider_subscription_id"),
  /** Stripe customer ID — used to correlate events without metadata lookups */
  stripeCustomerId: text("stripe_customer_id"),
  /** Price ID used for the active subscription — helps detect plan changes */
  providerPriceId: text("provider_price_id"),
  status: subscriptionStatusEnum("status").notNull().default("inactive"),
  renewalDate: timestamp("renewal_date"),
  /** Timestamp when the current billing period ends (from Stripe) */
  currentPeriodEnd: timestamp("current_period_end"),
  /** Whether the subscription is set to cancel at the end of the current period */
  cancelAtPeriodEnd: boolean("cancel_at_period_end").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

/**
 * stripe_events — idempotency log for Stripe webhook events.
 * Events with a duplicate event_id are rejected and not reprocessed.
 */
export const stripeEvents = pgTable("stripe_events", {
  id: serial("id").primaryKey(),
  eventId: text("event_id").notNull().unique(),
  type: text("type").notNull(),
  processed: boolean("processed").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const zoomTokens = pgTable("zoom_tokens", {
  id: serial("id").primaryKey(),
  telegramUserId: text("telegram_user_id").notNull(),
  accessToken: text("access_token").notNull(),
  refreshToken: text("refresh_token"),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const botLogs = pgTable("bot_logs", {
  id: serial("id").primaryKey(),
  level: text("level").notNull(), // info, warn, error
  message: text("message").notNull(),
  telegramUserId: text("telegram_user_id"),
  command: text("command"),
  timestamp: timestamp("timestamp").defaultNow(),
});

export const botMetrics = pgTable("bot_metrics", {
  id: serial("id").primaryKey(),
  activeUsers: integer("active_users").default(0),
  commandsToday: integer("commands_today").default(0),
  totalCommands: integer("total_commands").default(0),
  uptime: text("uptime"),
  lastUpdated: timestamp("last_updated").defaultNow(),
});

export const meetingInsights = pgTable("meeting_insights", {
  id: serial("id").primaryKey(),
  meetingId: text("meeting_id").notNull(),
  hostName: text("host_name"),
  participantCount: integer("participant_count").default(0),
  duration: integer("duration_minutes").default(0),
  status: text("status").notNull(), // active, ended, starting
  violations: integer("violations").default(0),
  multipinGrants: integer("multipin_grants").default(0),
  cohostPromotions: integer("cohost_promotions").default(0),
  startedAt: timestamp("started_at").defaultNow(),
  endedAt: timestamp("ended_at"),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertTelegramUserSchema = createInsertSchema(telegramUsers).omit({
  id: true,
  joinedAt: true,
  updatedAt: true,
});

export const insertSubscriptionSchema = createInsertSchema(subscriptions).omit({
  id: true,
  createdAt: true,
});

export const insertStripeEventSchema = createInsertSchema(stripeEvents).omit({
  id: true,
  createdAt: true,
});

export const insertZoomTokenSchema = createInsertSchema(zoomTokens).omit({
  id: true,
  createdAt: true,
});

export const insertBotLogSchema = createInsertSchema(botLogs).omit({
  id: true,
  timestamp: true,
});

export const insertBotMetricsSchema = createInsertSchema(botMetrics).omit({
  id: true,
  lastUpdated: true,
});

export const insertMeetingInsightsSchema = createInsertSchema(meetingInsights).omit({
  id: true,
  startedAt: true,
});

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type TelegramUser = typeof telegramUsers.$inferSelect;
export type InsertTelegramUser = z.infer<typeof insertTelegramUserSchema>;
export type ZoomToken = typeof zoomTokens.$inferSelect;
export type InsertZoomToken = z.infer<typeof insertZoomTokenSchema>;
export type BotLog = typeof botLogs.$inferSelect;
export type InsertBotLog = z.infer<typeof insertBotLogSchema>;
export type BotMetrics = typeof botMetrics.$inferSelect;
export type InsertBotMetrics = z.infer<typeof insertBotMetricsSchema>;
export type MeetingInsights = typeof meetingInsights.$inferSelect;
export type InsertMeetingInsights = z.infer<typeof insertMeetingInsightsSchema>;
export type Subscription = typeof subscriptions.$inferSelect;
export type InsertSubscription = z.infer<typeof insertSubscriptionSchema>;
export type StripeEvent = typeof stripeEvents.$inferSelect;
export type InsertStripeEvent = z.infer<typeof insertStripeEventSchema>;


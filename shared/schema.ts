import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Token wallet type constants (values defined in config/tokenCosts.js)
export const TOKEN_TRANSACTION_TYPES = ["credit", "debit"] as const;
export const TOKEN_TRANSACTION_SOURCES = [
  "subscription_refill",
  "manual_credit",
  "feature_use",
  "admin_adjustment",
] as const;

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const telegramUsers = pgTable("telegram_users", {
  id: serial("id").primaryKey(),
  telegramId: text("telegram_id").notNull().unique(),
  username: text("username"),
  firstName: text("first_name"),
  lastName: text("last_name"),
  isActive: boolean("is_active").default(true),
  subscriptionPlan: text("subscription_plan").default("free"), // free, premium, pro
  joinedAt: timestamp("joined_at").defaultNow(),
});

export const tokenTransactions = pgTable("token_transactions", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(), // telegram_id
  amount: integer("amount").notNull(), // positive for credit, negative for debit
  type: text("type").notNull(), // credit | debit
  source: text("source").notNull(), // subscription_refill | manual_credit | feature_use | admin_adjustment
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

export const insertTokenTransactionSchema = createInsertSchema(tokenTransactions).omit({
  id: true,
  createdAt: true,
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
export type TokenTransaction = typeof tokenTransactions.$inferSelect;
export type InsertTokenTransaction = z.infer<typeof insertTokenTransactionSchema>;

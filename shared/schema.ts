import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

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
  joinedAt: timestamp("joined_at").defaultNow(),
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

// Sticker Draft, Review, and Disposal System

export const stickerDrafts = pgTable("sticker_drafts", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  chatId: text("chat_id").notNull(),
  sourceFileId: text("source_file_id").notNull(),
  generatedFileId: text("generated_file_id"),
  fileType: text("file_type").notNull().default("photo"), // photo | sticker
  status: text("status").notNull().default("draft"), // draft | approved | rejected | archived | expired | published
  messageId: integer("message_id"),
  linkedStyleId: text("linked_style_id"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  expiresAt: timestamp("expires_at"),
});

export const stickerCollections = pgTable("sticker_collections", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  name: text("name").notNull(),
  type: text("type").notNull().default("personal"), // personal | shared
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const stickerCollectionItems = pgTable("sticker_collection_items", {
  id: serial("id").primaryKey(),
  collectionId: integer("collection_id").notNull(),
  draftId: integer("draft_id").notNull(),
  telegramFileId: text("telegram_file_id"),
  position: integer("position").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const stickerTrash = pgTable("sticker_trash", {
  id: serial("id").primaryKey(),
  draftId: integer("draft_id").notNull(),
  userId: text("user_id").notNull(),
  reason: text("reason"),
  scheduledDeleteAt: timestamp("scheduled_delete_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertStickerDraftSchema = createInsertSchema(stickerDrafts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertStickerCollectionSchema = createInsertSchema(stickerCollections).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertStickerCollectionItemSchema = createInsertSchema(stickerCollectionItems).omit({
  id: true,
  createdAt: true,
});

export const insertStickerTrashSchema = createInsertSchema(stickerTrash).omit({
  id: true,
  createdAt: true,
});

export type StickerDraft = typeof stickerDrafts.$inferSelect;
export type InsertStickerDraft = z.infer<typeof insertStickerDraftSchema>;
export type StickerCollection = typeof stickerCollections.$inferSelect;
export type InsertStickerCollection = z.infer<typeof insertStickerCollectionSchema>;
export type StickerCollectionItem = typeof stickerCollectionItems.$inferSelect;
export type InsertStickerCollectionItem = z.infer<typeof insertStickerCollectionItemSchema>;
export type StickerTrash = typeof stickerTrash.$inferSelect;
export type InsertStickerTrash = z.infer<typeof insertStickerTrashSchema>;

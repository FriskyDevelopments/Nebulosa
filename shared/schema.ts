import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// ─── Magic Cut: Plans ────────────────────────────────────────────────────────

export const plans = pgTable("plans", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),           // e.g. "Free", "Premium"
  slug: text("slug").notNull().unique(),  // e.g. "free", "premium"
  description: text("description"),
});

// ─── Magic Cut: Users (extended) ────────────────────────────────────────────

export const magicCutUsers = pgTable("magic_cut_users", {
  id: serial("id").primaryKey(),
  telegramId: text("telegram_id").unique(),
  email: text("email"),
  username: text("username"),
  planId: integer("plan_id").notNull().default(1), // references plans.id
  status: text("status").notNull().default("active"), // active | suspended | banned
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ─── Magic Cut: Catalog Masks ────────────────────────────────────────────────

export const catalogMasks = pgTable("catalog_masks", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description"),
  previewImageUrl: text("preview_image_url"),
  maskFileUrl: text("mask_file_url"),
  // category: basic | rounded | outline | glow | premium | experimental | custom
  category: text("category").notNull().default("basic"),
  // status: draft | active | archived | pending_review | rejected
  status: text("status").notNull().default("active"),
  // visibility: public | premium | pro | admin_only
  visibility: text("visibility").notNull().default("public"),
  createdBy: integer("created_by"), // references magic_cut_users.id
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ─── Magic Cut: User Uploads ─────────────────────────────────────────────────

export const userUploads = pgTable("user_uploads", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(), // references magic_cut_users.id
  originalFileUrl: text("original_file_url").notNull(),
  fileType: text("file_type"),           // e.g. "image/png"
  // status: pending | ready | failed
  status: text("status").notNull().default("pending"),
  createdAt: timestamp("created_at").defaultNow(),
});

// ─── Magic Cut: Cut Jobs ─────────────────────────────────────────────────────

export const cutJobs = pgTable("cut_jobs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),   // references magic_cut_users.id
  uploadId: integer("upload_id").notNull(), // references user_uploads.id
  maskId: integer("mask_id").notNull(),   // references catalog_masks.id
  outputFileUrl: text("output_file_url"),
  // jobStatus: queued | processing | completed | failed | cancelled
  jobStatus: text("job_status").notNull().default("queued"),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ─── Magic Cut: Mask Submissions ─────────────────────────────────────────────

export const maskSubmissions = pgTable("mask_submissions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),   // references magic_cut_users.id
  name: text("name").notNull(),
  description: text("description"),
  previewImageUrl: text("preview_image_url"),
  maskFileUrl: text("mask_file_url"),
  // submissionStatus: pending_review | approved | rejected | needs_changes | published
  submissionStatus: text("submission_status").notNull().default("pending_review"),
  reviewNotes: text("review_notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ─── Magic Cut: Permissions ───────────────────────────────────────────────────

export const permissions = pgTable("permissions", {
  id: serial("id").primaryKey(),
  planId: integer("plan_id").notNull(),    // references plans.id
  resource: text("resource").notNull(),    // e.g. "catalog_mask"
  action: text("action").notNull(),        // e.g. "use_basic", "use_premium"
  isAllowed: boolean("is_allowed").notNull().default(false),
});

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

// ─── Magic Cut insert schemas ─────────────────────────────────────────────────

export const insertPlanSchema = createInsertSchema(plans).omit({ id: true });

export const insertMagicCutUserSchema = createInsertSchema(magicCutUsers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCatalogMaskSchema = createInsertSchema(catalogMasks).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertUserUploadSchema = createInsertSchema(userUploads).omit({
  id: true,
  createdAt: true,
});

export const insertCutJobSchema = createInsertSchema(cutJobs).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertMaskSubmissionSchema = createInsertSchema(maskSubmissions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPermissionSchema = createInsertSchema(permissions).omit({ id: true });

// ─── Magic Cut types ──────────────────────────────────────────────────────────

export type Plan = typeof plans.$inferSelect;
export type InsertPlan = z.infer<typeof insertPlanSchema>;

export type MagicCutUser = typeof magicCutUsers.$inferSelect;
export type InsertMagicCutUser = z.infer<typeof insertMagicCutUserSchema>;

export type CatalogMask = typeof catalogMasks.$inferSelect;
export type InsertCatalogMask = z.infer<typeof insertCatalogMaskSchema>;

export type UserUpload = typeof userUploads.$inferSelect;
export type InsertUserUpload = z.infer<typeof insertUserUploadSchema>;

export type CutJob = typeof cutJobs.$inferSelect;
export type InsertCutJob = z.infer<typeof insertCutJobSchema>;

export type MaskSubmission = typeof maskSubmissions.$inferSelect;
export type InsertMaskSubmission = z.infer<typeof insertMaskSubmissionSchema>;

export type Permission = typeof permissions.$inferSelect;
export type InsertPermission = z.infer<typeof insertPermissionSchema>;

import { telegramUsers, zoomTokens, botLogs, botMetrics, meetingInsights, type TelegramUser, type InsertTelegramUser, type ZoomToken, type InsertZoomToken, type BotLog, type InsertBotLog, type BotMetrics, type InsertBotMetrics, type MeetingInsights, type InsertMeetingInsights } from "@shared/schema";
import type {
  Plan, InsertPlan,
  MagicCutUser, InsertMagicCutUser,
  CatalogMask, InsertCatalogMask,
  UserUpload, InsertUserUpload,
  CutJob, InsertCutJob,
  MaskSubmission, InsertMaskSubmission,
  Permission, InsertPermission,
} from "@shared/schema";

// ─── Catalog filter shape used by the catalog service ─────────────────────────
export interface CatalogMaskFilter {
  category?: string;
  status?: string;
  visibilities?: string[];
}

export interface IStorage {
  // Telegram Users
  getTelegramUser(telegramId: string): Promise<TelegramUser | undefined>;
  createTelegramUser(user: InsertTelegramUser): Promise<TelegramUser>;
  updateTelegramUser(telegramId: string, updates: Partial<TelegramUser>): Promise<TelegramUser | undefined>;
  getActiveTelegramUsersCount(): Promise<number>;

  // Zoom Tokens
  getZoomToken(telegramUserId: string): Promise<ZoomToken | undefined>;
  createZoomToken(token: InsertZoomToken): Promise<ZoomToken>;
  updateZoomToken(telegramUserId: string, updates: Partial<ZoomToken>): Promise<ZoomToken | undefined>;
  deleteZoomToken(telegramUserId: string): Promise<boolean>;

  // Bot Logs
  createBotLog(log: InsertBotLog): Promise<BotLog>;
  getBotLogs(limit?: number): Promise<BotLog[]>;

  // Bot Metrics
  getBotMetrics(): Promise<BotMetrics | undefined>;
  updateBotMetrics(metrics: Partial<BotMetrics>): Promise<BotMetrics>;

  // Meeting Insights
  createMeetingInsight(insight: InsertMeetingInsights): Promise<MeetingInsights>;
  getMeetingInsights(limit?: number): Promise<MeetingInsights[]>;
  getActiveMeetingInsights(): Promise<MeetingInsights[]>;
  updateMeetingInsight(meetingId: string, updates: Partial<MeetingInsights>): Promise<MeetingInsights | undefined>;
  endMeeting(meetingId: string): Promise<MeetingInsights | undefined>;

  // ─── Magic Cut: Plans ──────────────────────────────────────────────────────
  getPlan(id: number): Promise<Plan | undefined>;
  getPlanBySlug(slug: string): Promise<Plan | undefined>;
  listPlans(): Promise<Plan[]>;
  createPlan(plan: InsertPlan): Promise<Plan>;

  // ─── Magic Cut: Users ──────────────────────────────────────────────────────
  getMagicCutUser(id: number): Promise<MagicCutUser | undefined>;
  getMagicCutUserByTelegramId(telegramId: string): Promise<MagicCutUser | undefined>;
  createMagicCutUser(user: InsertMagicCutUser): Promise<MagicCutUser>;
  updateMagicCutUser(id: number, updates: Partial<MagicCutUser>): Promise<MagicCutUser | undefined>;

  // ─── Magic Cut: Catalog Masks ──────────────────────────────────────────────
  getCatalogMask(id: number): Promise<CatalogMask | undefined>;
  listCatalogMasks(filter?: CatalogMaskFilter): Promise<CatalogMask[]>;
  createCatalogMask(mask: InsertCatalogMask): Promise<CatalogMask>;
  updateCatalogMask(id: number, updates: Partial<CatalogMask>): Promise<CatalogMask | undefined>;

  // ─── Magic Cut: User Uploads ───────────────────────────────────────────────
  getUserUpload(id: number): Promise<UserUpload | undefined>;
  createUserUpload(upload: InsertUserUpload): Promise<UserUpload>;

  // ─── Magic Cut: Cut Jobs ───────────────────────────────────────────────────
  getCutJob(id: number): Promise<CutJob | undefined>;
  getCutJobsByUser(userId: number): Promise<CutJob[]>;
  createCutJob(job: InsertCutJob): Promise<CutJob>;
  updateCutJob(id: number, updates: Partial<CutJob>): Promise<CutJob | undefined>;

  // ─── Magic Cut: Mask Submissions ──────────────────────────────────────────
  getMaskSubmission(id: number): Promise<MaskSubmission | undefined>;
  getMaskSubmissionsByUser(userId: number): Promise<MaskSubmission[]>;
  listMaskSubmissions(status?: string): Promise<MaskSubmission[]>;
  createMaskSubmission(sub: InsertMaskSubmission): Promise<MaskSubmission>;
  updateMaskSubmission(id: number, updates: Partial<MaskSubmission>): Promise<MaskSubmission | undefined>;

  // ─── Magic Cut: Permissions ────────────────────────────────────────────────
  getPermission(planId: number, resource: string, action: string): Promise<boolean | undefined>;
  getPermissionsForPlan(planId: number): Promise<Permission[]>;
  createPermission(perm: InsertPermission): Promise<Permission>;
}

export class MemStorage implements IStorage {
  private telegramUsers: Map<string, TelegramUser>;
  private zoomTokens: Map<string, ZoomToken>;
  private botLogs: BotLog[];
  private botMetrics: BotMetrics | undefined;
  private meetingInsights: Map<string, MeetingInsights>;
  private currentId: number;

  // ─── Magic Cut in-memory stores ────────────────────────────────────────────
  private plans: Map<number, Plan>;
  private mcUsers: Map<number, MagicCutUser>;
  private catalogMasks: Map<number, CatalogMask>;
  private userUploads: Map<number, UserUpload>;
  private cutJobs: Map<number, CutJob>;
  private maskSubmissions: Map<number, MaskSubmission>;
  private perms: Permission[];

  constructor() {
    this.telegramUsers = new Map();
    this.zoomTokens = new Map();
    this.botLogs = [];
    this.botMetrics = undefined;
    this.meetingInsights = new Map();
    this.currentId = 1;

    // Magic Cut stores
    this.plans = new Map();
    this.mcUsers = new Map();
    this.catalogMasks = new Map();
    this.userUploads = new Map();
    this.cutJobs = new Map();
    this.maskSubmissions = new Map();
    this.perms = [];

    // Add sample meeting data for testing
    this.initializeSampleData();
    this.initializeMagicCutSeedData();
  }

  private initializeSampleData() {
    // Active meeting
    const activeMeeting: MeetingInsights = {
      id: this.currentId++,
      meetingId: '12345678901',
      hostUserId: '7695459242',
      topic: 'LA NUBE BOT Test Session',
      status: 'active',
      currentParticipants: 8,
      maxParticipants: 12,
      cameraOnCount: 6,
      micOffCount: 2,
      violations: 1,
      multipinUsersCount: 4,
      startedAt: new Date(Date.now() - 45 * 60000), // 45 minutes ago
      endedAt: null,
      duration: null
    };
    this.meetingInsights.set(activeMeeting.meetingId, activeMeeting);

    // Recent ended meeting
    const endedMeeting: MeetingInsights = {
      id: this.currentId++,
      meetingId: '98765432109',
      hostUserId: '7695459242',
      topic: 'Weekly Team Sync',
      status: 'ended',
      currentParticipants: 0,
      maxParticipants: 15,
      cameraOnCount: 0,
      micOffCount: 0,
      violations: 3,
      multipinUsersCount: 8,
      startedAt: new Date(Date.now() - 2 * 60 * 60000), // 2 hours ago
      endedAt: new Date(Date.now() - 90 * 60000), // 1.5 hours ago
      duration: 30
    };
    this.meetingInsights.set(endedMeeting.meetingId, endedMeeting);

    // Another recent meeting
    const recentMeeting: MeetingInsights = {
      id: this.currentId++,
      meetingId: '11223344556',
      hostUserId: '7695459242',
      topic: 'Client Presentation',
      status: 'ended',
      currentParticipants: 0,
      maxParticipants: 6,
      cameraOnCount: 0,
      micOffCount: 0,
      violations: 0,
      multipinUsersCount: 6,
      startedAt: new Date(Date.now() - 24 * 60 * 60000), // 1 day ago
      endedAt: new Date(Date.now() - 23 * 60 * 60000), // 23 hours ago
      duration: 60
    };
    this.meetingInsights.set(recentMeeting.meetingId, recentMeeting);
  }

  async getTelegramUser(telegramId: string): Promise<TelegramUser | undefined> {
    return this.telegramUsers.get(telegramId);
  }

  async createTelegramUser(insertUser: InsertTelegramUser): Promise<TelegramUser> {
    const id = this.currentId++;
    const user: TelegramUser = {
      ...insertUser,
      id,
      joinedAt: new Date(),
    };
    this.telegramUsers.set(insertUser.telegramId, user);
    return user;
  }

  async updateTelegramUser(telegramId: string, updates: Partial<TelegramUser>): Promise<TelegramUser | undefined> {
    const user = this.telegramUsers.get(telegramId);
    if (!user) return undefined;
    
    const updatedUser = { ...user, ...updates };
    this.telegramUsers.set(telegramId, updatedUser);
    return updatedUser;
  }

  async getActiveTelegramUsersCount(): Promise<number> {
    return Array.from(this.telegramUsers.values()).filter(user => user.isActive).length;
  }

  async getZoomToken(telegramUserId: string): Promise<ZoomToken | undefined> {
    return this.zoomTokens.get(telegramUserId);
  }

  async createZoomToken(insertToken: InsertZoomToken): Promise<ZoomToken> {
    const id = this.currentId++;
    const token: ZoomToken = {
      ...insertToken,
      id,
      createdAt: new Date(),
    };
    this.zoomTokens.set(insertToken.telegramUserId, token);
    return token;
  }

  async updateZoomToken(telegramUserId: string, updates: Partial<ZoomToken>): Promise<ZoomToken | undefined> {
    const token = this.zoomTokens.get(telegramUserId);
    if (!token) return undefined;
    
    const updatedToken = { ...token, ...updates };
    this.zoomTokens.set(telegramUserId, updatedToken);
    return updatedToken;
  }

  async deleteZoomToken(telegramUserId: string): Promise<boolean> {
    return this.zoomTokens.delete(telegramUserId);
  }

  async createBotLog(insertLog: InsertBotLog): Promise<BotLog> {
    const id = this.currentId++;
    const log: BotLog = {
      ...insertLog,
      id,
      timestamp: new Date(),
    };
    this.botLogs.push(log);
    return log;
  }

  async getBotLogs(limit = 50): Promise<BotLog[]> {
    return this.botLogs
      .sort((a, b) => b.timestamp!.getTime() - a.timestamp!.getTime())
      .slice(0, limit);
  }

  async getBotMetrics(): Promise<BotMetrics | undefined> {
    return this.botMetrics;
  }

  async updateBotMetrics(updates: Partial<BotMetrics>): Promise<BotMetrics> {
    const id = this.currentId++;
    this.botMetrics = {
      id,
      activeUsers: 0,
      commandsToday: 0,
      totalCommands: 0,
      uptime: "0d 0h 0m",
      ...this.botMetrics,
      ...updates,
      lastUpdated: new Date(),
    };
    return this.botMetrics;
  }

  async createMeetingInsight(insertInsight: InsertMeetingInsights): Promise<MeetingInsights> {
    const id = this.currentId++;
    const insight: MeetingInsights = {
      ...insertInsight,
      id,
      startedAt: new Date(),
    };
    this.meetingInsights.set(insertInsight.meetingId, insight);
    return insight;
  }

  async getMeetingInsights(limit = 10): Promise<MeetingInsights[]> {
    const insights = Array.from(this.meetingInsights.values());
    return insights
      .sort((a, b) => new Date(b.startedAt!).getTime() - new Date(a.startedAt!).getTime())
      .slice(0, limit);
  }

  async getActiveMeetingInsights(): Promise<MeetingInsights[]> {
    return Array.from(this.meetingInsights.values()).filter(insight => insight.status === 'active');
  }

  async updateMeetingInsight(meetingId: string, updates: Partial<MeetingInsights>): Promise<MeetingInsights | undefined> {
    const insight = this.meetingInsights.get(meetingId);
    if (!insight) return undefined;
    
    const updatedInsight = { ...insight, ...updates };
    this.meetingInsights.set(meetingId, updatedInsight);
    return updatedInsight;
  }

  async endMeeting(meetingId: string): Promise<MeetingInsights | undefined> {
    const insight = this.meetingInsights.get(meetingId);
    if (!insight) return undefined;
    
    const duration = insight.startedAt ? Math.floor((Date.now() - new Date(insight.startedAt).getTime()) / 60000) : 0;
    const updatedInsight = { 
      ...insight, 
      status: 'ended' as const,
      endedAt: new Date(),
      duration
    };
    this.meetingInsights.set(meetingId, updatedInsight);
    return updatedInsight;
  }

  // ─── Magic Cut seed data ───────────────────────────────────────────────────

  private initializeMagicCutSeedData() {
    // Seed plans
    const planDefs = [
      { name: "Free", slug: "free", description: "Basic access — public masks only" },
      { name: "Premium", slug: "premium", description: "Premium masks + custom submissions" },
      { name: "Pro", slug: "pro", description: "All masks + priority processing" },
      { name: "Enterprise", slug: "enterprise", description: "Full access + admin tools" },
    ];
    for (const p of planDefs) {
      const id = this.currentId++;
      this.plans.set(id, { id, ...p });
    }

    // Seed catalog masks
    const maskDefs: Array<Omit<CatalogMask, "id">> = [
      {
        name: "Classic Round",
        slug: "classic-round",
        description: "Simple circular cut for any sticker.",
        previewImageUrl: "/masks/previews/classic-round.png",
        maskFileUrl: "/masks/files/classic-round.svg",
        category: "rounded",
        status: "active",
        visibility: "public",
        createdBy: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: "Sharp Outline",
        slug: "sharp-outline",
        description: "Edge-detected silhouette cut.",
        previewImageUrl: "/masks/previews/sharp-outline.png",
        maskFileUrl: "/masks/files/sharp-outline.svg",
        category: "outline",
        status: "active",
        visibility: "public",
        createdBy: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: "Glow Border",
        slug: "glow-border",
        description: "Sticker with a soft glow border effect.",
        previewImageUrl: "/masks/previews/glow-border.png",
        maskFileUrl: "/masks/files/glow-border.svg",
        category: "glow",
        status: "active",
        visibility: "premium",
        createdBy: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: "Premium Star",
        slug: "premium-star",
        description: "Star-shaped premium cut.",
        previewImageUrl: "/masks/previews/premium-star.png",
        maskFileUrl: "/masks/files/premium-star.svg",
        category: "premium",
        status: "active",
        visibility: "premium",
        createdBy: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];
    for (const m of maskDefs) {
      const id = this.currentId++;
      this.catalogMasks.set(id, { id, ...m });
    }
  }

  // ─── Magic Cut: Plans ──────────────────────────────────────────────────────

  async getPlan(id: number): Promise<Plan | undefined> {
    return this.plans.get(id);
  }

  async getPlanBySlug(slug: string): Promise<Plan | undefined> {
    return Array.from(this.plans.values()).find(p => p.slug === slug);
  }

  async listPlans(): Promise<Plan[]> {
    return Array.from(this.plans.values());
  }

  async createPlan(plan: InsertPlan): Promise<Plan> {
    const id = this.currentId++;
    const newPlan: Plan = { id, description: null, ...plan };
    this.plans.set(id, newPlan);
    return newPlan;
  }

  // ─── Magic Cut: Users ──────────────────────────────────────────────────────

  async getMagicCutUser(id: number): Promise<MagicCutUser | undefined> {
    return this.mcUsers.get(id);
  }

  async getMagicCutUserByTelegramId(telegramId: string): Promise<MagicCutUser | undefined> {
    return Array.from(this.mcUsers.values()).find(u => u.telegramId === telegramId);
  }

  async createMagicCutUser(user: InsertMagicCutUser): Promise<MagicCutUser> {
    const id = this.currentId++;
    const now = new Date();
    const newUser: MagicCutUser = {
      id,
      telegramId: null,
      email: null,
      username: null,
      planId: 1,
      status: "active",
      createdAt: now,
      updatedAt: now,
      ...user,
    };
    this.mcUsers.set(id, newUser);
    return newUser;
  }

  async updateMagicCutUser(id: number, updates: Partial<MagicCutUser>): Promise<MagicCutUser | undefined> {
    const user = this.mcUsers.get(id);
    if (!user) return undefined;
    const updated = { ...user, ...updates, updatedAt: new Date() };
    this.mcUsers.set(id, updated);
    return updated;
  }

  // ─── Magic Cut: Catalog Masks ──────────────────────────────────────────────

  async getCatalogMask(id: number): Promise<CatalogMask | undefined> {
    return this.catalogMasks.get(id);
  }

  async listCatalogMasks(filter: CatalogMaskFilter = {}): Promise<CatalogMask[]> {
    let masks = Array.from(this.catalogMasks.values());
    if (filter.category) masks = masks.filter(m => m.category === filter.category);
    if (filter.status)   masks = masks.filter(m => m.status === filter.status);
    if (filter.visibilities?.length) {
      masks = masks.filter(m => (filter.visibilities as string[]).includes(m.visibility));
    }
    return masks;
  }

  async createCatalogMask(mask: InsertCatalogMask): Promise<CatalogMask> {
    const id = this.currentId++;
    const now = new Date();
    const newMask: CatalogMask = {
      id,
      description: null,
      previewImageUrl: null,
      maskFileUrl: null,
      category: "basic",
      status: "active",
      visibility: "public",
      createdBy: null,
      createdAt: now,
      updatedAt: now,
      ...mask,
    };
    this.catalogMasks.set(id, newMask);
    return newMask;
  }

  async updateCatalogMask(id: number, updates: Partial<CatalogMask>): Promise<CatalogMask | undefined> {
    const mask = this.catalogMasks.get(id);
    if (!mask) return undefined;
    const updated = { ...mask, ...updates, updatedAt: new Date() };
    this.catalogMasks.set(id, updated);
    return updated;
  }

  // ─── Magic Cut: User Uploads ───────────────────────────────────────────────

  async getUserUpload(id: number): Promise<UserUpload | undefined> {
    return this.userUploads.get(id);
  }

  async createUserUpload(upload: InsertUserUpload): Promise<UserUpload> {
    const id = this.currentId++;
    const newUpload: UserUpload = {
      id,
      fileType: null,
      status: "pending",
      createdAt: new Date(),
      ...upload,
    };
    this.userUploads.set(id, newUpload);
    return newUpload;
  }

  // ─── Magic Cut: Cut Jobs ───────────────────────────────────────────────────

  async getCutJob(id: number): Promise<CutJob | undefined> {
    return this.cutJobs.get(id);
  }

  async getCutJobsByUser(userId: number): Promise<CutJob[]> {
    return Array.from(this.cutJobs.values()).filter(j => j.userId === userId);
  }

  async createCutJob(job: InsertCutJob): Promise<CutJob> {
    const id = this.currentId++;
    const now = new Date();
    const newJob: CutJob = {
      id,
      outputFileUrl: null,
      jobStatus: "queued",
      errorMessage: null,
      createdAt: now,
      updatedAt: now,
      ...job,
    };
    this.cutJobs.set(id, newJob);
    return newJob;
  }

  async updateCutJob(id: number, updates: Partial<CutJob>): Promise<CutJob | undefined> {
    const job = this.cutJobs.get(id);
    if (!job) return undefined;
    const updated = { ...job, ...updates, updatedAt: new Date() };
    this.cutJobs.set(id, updated);
    return updated;
  }

  // ─── Magic Cut: Mask Submissions ──────────────────────────────────────────

  async getMaskSubmission(id: number): Promise<MaskSubmission | undefined> {
    return this.maskSubmissions.get(id);
  }

  async getMaskSubmissionsByUser(userId: number): Promise<MaskSubmission[]> {
    return Array.from(this.maskSubmissions.values()).filter(s => s.userId === userId);
  }

  async listMaskSubmissions(status?: string): Promise<MaskSubmission[]> {
    let subs = Array.from(this.maskSubmissions.values());
    if (status) subs = subs.filter(s => s.submissionStatus === status);
    return subs.sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime());
  }

  async createMaskSubmission(sub: InsertMaskSubmission): Promise<MaskSubmission> {
    const id = this.currentId++;
    const now = new Date();
    const newSub: MaskSubmission = {
      id,
      description: null,
      previewImageUrl: null,
      maskFileUrl: null,
      submissionStatus: "pending_review",
      reviewNotes: null,
      createdAt: now,
      updatedAt: now,
      ...sub,
    };
    this.maskSubmissions.set(id, newSub);
    return newSub;
  }

  async updateMaskSubmission(id: number, updates: Partial<MaskSubmission>): Promise<MaskSubmission | undefined> {
    const sub = this.maskSubmissions.get(id);
    if (!sub) return undefined;
    const updated = { ...sub, ...updates, updatedAt: new Date() };
    this.maskSubmissions.set(id, updated);
    return updated;
  }

  // ─── Magic Cut: Permissions ────────────────────────────────────────────────

  async getPermission(planId: number, resource: string, action: string): Promise<boolean | undefined> {
    const perm = this.perms.find(
      p => p.planId === planId && p.resource === resource && p.action === action,
    );
    return perm?.isAllowed;
  }

  async getPermissionsForPlan(planId: number): Promise<Permission[]> {
    return this.perms.filter(p => p.planId === planId);
  }

  async createPermission(perm: InsertPermission): Promise<Permission> {
    const id = this.currentId++;
    const newPerm: Permission = { id, isAllowed: false, ...perm };
    this.perms.push(newPerm);
    return newPerm;
  }
}

export const storage = new MemStorage();

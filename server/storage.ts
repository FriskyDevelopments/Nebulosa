import { telegramUsers, zoomTokens, botLogs, botMetrics, meetingInsights, stickerSpells, type TelegramUser, type InsertTelegramUser, type ZoomToken, type InsertZoomToken, type BotLog, type InsertBotLog, type BotMetrics, type InsertBotMetrics, type MeetingInsights, type InsertMeetingInsights, type StickerSpell, type InsertStickerSpell } from "@shared/schema";

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

  // Sticker Spells
  createStickerSpell(spell: InsertStickerSpell): Promise<StickerSpell>;
  getStickerSpells(): Promise<StickerSpell[]>;
  getStickerSpellByFileId(stickerFileId: string): Promise<StickerSpell | undefined>;
  deleteStickerSpell(id: number): Promise<boolean>;
}

export class MemStorage implements IStorage {
  private telegramUsers: Map<string, TelegramUser>;
  private zoomTokens: Map<string, ZoomToken>;
  private botLogs: BotLog[];
  private botMetrics: BotMetrics | undefined;
  private meetingInsights: Map<string, MeetingInsights>;
  private stickerSpellsMap: Map<number, StickerSpell>;
  private currentId: number;

  constructor() {
    this.telegramUsers = new Map();
    this.zoomTokens = new Map();
    this.botLogs = [];
    this.botMetrics = undefined;
    this.meetingInsights = new Map();
    this.stickerSpellsMap = new Map();
    this.currentId = 1;
    
    // Add sample meeting data for testing
    this.initializeSampleData();
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

  async createStickerSpell(insertSpell: InsertStickerSpell): Promise<StickerSpell> {
    const id = this.currentId++;
    const spell: StickerSpell = {
      ...insertSpell,
      id,
      tokenCost: insertSpell.tokenCost ?? 0,
      createdAt: new Date(),
    };
    this.stickerSpellsMap.set(id, spell);
    return spell;
  }

  async getStickerSpells(): Promise<StickerSpell[]> {
    return Array.from(this.stickerSpellsMap.values()).sort(
      (a, b) => (a.createdAt ? a.createdAt.getTime() : 0) - (b.createdAt ? b.createdAt.getTime() : 0)
    );
  }

  async getStickerSpellByFileId(stickerFileId: string): Promise<StickerSpell | undefined> {
    return Array.from(this.stickerSpellsMap.values()).find(
      (spell) => spell.stickerFileId === stickerFileId
    );
  }

  async deleteStickerSpell(id: number): Promise<boolean> {
    return this.stickerSpellsMap.delete(id);
  }
}

export const storage = new MemStorage();

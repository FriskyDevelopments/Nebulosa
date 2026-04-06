import { describe, it, expect, beforeEach } from "vitest";
import { MemStorage } from "./storage";
import {
  InsertTelegramUser,
  InsertZoomToken,
  InsertBotLog,
  InsertBotMetrics,
  InsertMeetingInsights,
  InsertEmojiPack,
  InsertEmojiAsset,
  InsertEmojiFont,
  InsertEmojiFontGlyph
} from "@shared/schema";

describe("MemStorage", () => {
  let storage: MemStorage;

  beforeEach(() => {
    storage = new MemStorage();
    // Some methods rely on timestamp or initialize Sample Data which might interfere. We will test the functionality anyway.
  });

  describe("Telegram Users", () => {
    it("should return undefined for a non-existent telegram user", async () => {
      const user = await storage.getTelegramUser("nonexistent");
      expect(user).toBeUndefined();
    });

    it("should create and retrieve a telegram user", async () => {
      const newUserData: InsertTelegramUser = {
        telegramId: "12345",
        username: "testuser",
        firstName: "Test",
        lastName: "User",
        isActive: true,
      };

      const createdUser = await storage.createTelegramUser(newUserData);
      expect(createdUser.telegramId).toBe("12345");
      expect(createdUser.username).toBe("testuser");
      expect(createdUser.id).toBeDefined();

      const retrievedUser = await storage.getTelegramUser("12345");
      expect(retrievedUser).toBeDefined();
      expect(retrievedUser?.telegramId).toBe("12345");
    });

    it("should update a telegram user", async () => {
      const newUserData: InsertTelegramUser = {
        telegramId: "12345",
        username: "testuser",
        isActive: true,
      };
      await storage.createTelegramUser(newUserData);

      const updatedUser = await storage.updateTelegramUser("12345", { username: "updateduser", isActive: false });
      expect(updatedUser?.username).toBe("updateduser");
      expect(updatedUser?.isActive).toBe(false);

      const retrievedUser = await storage.getTelegramUser("12345");
      expect(retrievedUser?.username).toBe("updateduser");
      expect(retrievedUser?.isActive).toBe(false);
    });

    it("should return undefined when updating a non-existent telegram user", async () => {
        const updatedUser = await storage.updateTelegramUser("nonexistent", { username: "updateduser" });
        expect(updatedUser).toBeUndefined();
    });

    it("should get active telegram users count", async () => {
        await storage.createTelegramUser({ telegramId: "1", isActive: true });
        await storage.createTelegramUser({ telegramId: "2", isActive: true });
        await storage.createTelegramUser({ telegramId: "3", isActive: false });

        const count = await storage.getActiveTelegramUsersCount();
        expect(count).toBe(2);
    });
  });

  describe("Zoom Tokens", () => {
      it("should return undefined for a non-existent zoom token", async () => {
          const token = await storage.getZoomToken("nonexistent");
          expect(token).toBeUndefined();
      });

      it("should create and retrieve a zoom token", async () => {
          const newTokenData: InsertZoomToken = {
              telegramUserId: "12345",
              accessToken: "access123",
              refreshToken: "refresh123",
              expiresAt: new Date(Date.now() + 3600 * 1000), // 1 hour from now
          };

          const createdToken = await storage.createZoomToken(newTokenData);
          expect(createdToken.telegramUserId).toBe("12345");
          expect(createdToken.accessToken).toBe("access123");

          const retrievedToken = await storage.getZoomToken("12345");
          expect(retrievedToken).toBeDefined();
          expect(retrievedToken?.accessToken).toBe("access123");
      });

      it("should update a zoom token", async () => {
          const newTokenData: InsertZoomToken = {
              telegramUserId: "12345",
              accessToken: "access123",
              expiresAt: new Date(Date.now() + 3600 * 1000),
          };
          await storage.createZoomToken(newTokenData);

          const updatedToken = await storage.updateZoomToken("12345", { accessToken: "newaccess" });
          expect(updatedToken?.accessToken).toBe("newaccess");

          const retrievedToken = await storage.getZoomToken("12345");
          expect(retrievedToken?.accessToken).toBe("newaccess");
      });

      it("should return undefined when updating a non-existent zoom token", async () => {
          const updatedToken = await storage.updateZoomToken("nonexistent", { accessToken: "newaccess" });
          expect(updatedToken).toBeUndefined();
      });

      it("should delete a zoom token", async () => {
          const newTokenData: InsertZoomToken = {
              telegramUserId: "12345",
              accessToken: "access123",
              expiresAt: new Date(),
          };
          await storage.createZoomToken(newTokenData);

          const result = await storage.deleteZoomToken("12345");
          expect(result).toBe(true);

          const retrievedToken = await storage.getZoomToken("12345");
          expect(retrievedToken).toBeUndefined();
      });

      it("should return false when deleting a non-existent zoom token", async () => {
          const result = await storage.deleteZoomToken("nonexistent");
          expect(result).toBe(false);
      });
  });

  describe("Bot Logs", () => {
      it("should create and retrieve bot logs", async () => {
          // Empty initial logs if any (just in case)
          // MemStorage adds items using push and getBotLogs sorts by timestamp descending

          const logData1: InsertBotLog = {
              level: "info",
              message: "Test message 1",
          };
          const logData2: InsertBotLog = {
              level: "error",
              message: "Test message 2",
              telegramUserId: "12345",
              command: "/start"
          };

          const log1 = await storage.createBotLog(logData1);
          // ensure slightly different timestamp if they are identical
          await new Promise(resolve => setTimeout(resolve, 10));
          const log2 = await storage.createBotLog(logData2);

          const logs = await storage.getBotLogs();
          // getBotLogs sorts by b.timestamp!.getTime() - a.timestamp!.getTime() -> descending

          expect(logs.find(l => l.message === "Test message 1")).toBeDefined();
          expect(logs.find(l => l.message === "Test message 2")).toBeDefined();
      });

      it("should respect the limit parameter when retrieving logs", async () => {
          for(let i = 0; i < 5; i++) {
              await storage.createBotLog({ level: "info", message: `Log ${i}` });
              await new Promise(resolve => setTimeout(resolve, 5));
          }

          const logs = await storage.getBotLogs(2);
          expect(logs.length).toBe(2);
      });
  });

  describe("Bot Metrics", () => {
      it("should retrieve metrics", async () => {
          const metrics = await storage.getBotMetrics();
          expect(metrics).toBeUndefined(); // undefined initially in constructor
      });

      it("should update bot metrics", async () => {
          const updatedMetrics = await storage.updateBotMetrics({
              activeUsers: 10,
              commandsToday: 5,
              totalCommands: 100,
              uptime: "1 day"
          });

          expect(updatedMetrics.activeUsers).toBe(10);
          expect(updatedMetrics.commandsToday).toBe(5);
          expect(updatedMetrics.totalCommands).toBe(100);
          expect(updatedMetrics.uptime).toBe("1 day");

          const retrievedMetrics = await storage.getBotMetrics();
          expect(retrievedMetrics?.activeUsers).toBe(10);
      });
  });

  describe("Meeting Insights", () => {
      it("should create and retrieve meeting insights", async () => {
          const insightData: InsertMeetingInsights = {
              meetingId: "meeting123",
              hostName: "Test Host",
              status: "active"
          };

          const createdInsight = await storage.createMeetingInsight(insightData);
          expect(createdInsight.meetingId).toBe("meeting123");
          expect(createdInsight.status).toBe("active");

          const insights = await storage.getMeetingInsights();
          expect(insights.find(i => i.meetingId === "meeting123")).toBeDefined();
      });

      it("should respect limit when retrieving meeting insights", async () => {
          await storage.createMeetingInsight({ meetingId: "m1", status: "active" });
          await storage.createMeetingInsight({ meetingId: "m2", status: "ended" });
          await storage.createMeetingInsight({ meetingId: "m3", status: "active" });

          const insights = await storage.getMeetingInsights(2);
          expect(insights.length).toBe(2);
      });

      it("should get active meeting insights", async () => {
          await storage.createMeetingInsight({ meetingId: "m1", status: "active" });
          await storage.createMeetingInsight({ meetingId: "m2", status: "ended" });
          await storage.createMeetingInsight({ meetingId: "m3", status: "starting" });
          await storage.createMeetingInsight({ meetingId: "m4", status: "active" });

          const activeInsights = await storage.getActiveMeetingInsights();
          const activeIds = activeInsights.map(i => i.meetingId);
          expect(activeIds).toContain("m1");
          expect(activeIds).toContain("m4");
          // The initializeSampleData method creates an active meeting with id '12345678901'
          // 'm3' is 'starting' so it won't be returned since getActiveMeetingInsights filters for 'active'
      });

      it("should update meeting insight", async () => {
          await storage.createMeetingInsight({ meetingId: "m1", status: "active", participantCount: 5 });

          const updated = await storage.updateMeetingInsight("m1", { participantCount: 10, violations: 2 });
          expect(updated?.participantCount).toBe(10);
          expect(updated?.violations).toBe(2);

          const insights = await storage.getMeetingInsights();
          expect(insights.find(i => i.meetingId === "m1")?.participantCount).toBe(10);
      });

      it("should return undefined when updating non-existent meeting insight", async () => {
          const updated = await storage.updateMeetingInsight("nonexistent", { participantCount: 10 });
          expect(updated).toBeUndefined();
      });

      it("should end meeting", async () => {
          await storage.createMeetingInsight({ meetingId: "m1", status: "active" });

          const ended = await storage.endMeeting("m1");
          expect(ended?.status).toBe("ended");
          expect(ended?.endedAt).toBeDefined();

          const activeInsights = await storage.getActiveMeetingInsights();
          expect(activeInsights.find(i => i.meetingId === "m1")).toBeUndefined();
      });

      it("should return undefined when ending non-existent meeting", async () => {
          const ended = await storage.endMeeting("nonexistent");
          expect(ended).toBeUndefined();
      });
  });

  describe("Emoji Packs", () => {
      it("should have sample emoji packs initialized", async () => {
          const packs = await storage.getEmojiPacks();
          expect(packs.length).toBeGreaterThan(0);
          expect(packs.find(p => p.slug === 'basic')).toBeDefined();
      });

      it("should filter emoji packs", async () => {
          const magicPacks = await storage.getEmojiPacks({ category: "magic" });
          expect(magicPacks.length).toBe(1);
          expect(magicPacks[0].slug).toBe("magic-symbols");

          const premiumPacks = await storage.getEmojiPacks({ visibility: "premium" });
          expect(premiumPacks.length).toBe(1);
          expect(premiumPacks[0].slug).toBe("neon-reactions");
      });

      it("should get a specific emoji pack", async () => {
          const packs = await storage.getEmojiPacks();
          const firstPackId = packs[0].id;

          const pack = await storage.getEmojiPack(firstPackId);
          expect(pack).toBeDefined();
          expect(pack?.id).toBe(firstPackId);
      });

      it("should return undefined for a non-existent emoji pack", async () => {
          const pack = await storage.getEmojiPack(9999);
          expect(pack).toBeUndefined();
      });

      it("should create a new emoji pack", async () => {
          const newPackData: InsertEmojiPack = {
              name: "Test Pack",
              slug: "test-pack",
              category: "experimental",
              visibility: "public",
              status: "draft"
          };

          const createdPack = await storage.createEmojiPack(newPackData);
          expect(createdPack.name).toBe("Test Pack");
          expect(createdPack.id).toBeDefined();

          const pack = await storage.getEmojiPack(createdPack.id);
          expect(pack).toBeDefined();
          expect(pack?.slug).toBe("test-pack");
      });
  });

  describe("Emoji Assets", () => {
      it("should have sample emoji assets for basic pack", async () => {
          const packs = await storage.getEmojiPacks({ category: "basic" });
          const basicPackId = packs[0].id;

          const assets = await storage.getEmojiAssets(basicPackId);
          expect(assets.length).toBeGreaterThan(0);
          expect(assets.find(a => a.name === "Heart")).toBeDefined();
      });

      it("should return empty array for non-existent pack assets", async () => {
          const assets = await storage.getEmojiAssets(9999);
          expect(assets).toEqual([]);
      });

      it("should create a new emoji asset", async () => {
          const packs = await storage.getEmojiPacks();
          const packId = packs[0].id;

          const newAssetData: InsertEmojiAsset = {
              packId,
              name: "New Asset",
              assetType: "png",
              visibility: "public"
          };

          const createdAsset = await storage.createEmojiAsset(newAssetData);
          expect(createdAsset.name).toBe("New Asset");
          expect(createdAsset.id).toBeDefined();

          const assets = await storage.getEmojiAssets(packId);
          expect(assets.find(a => a.id === createdAsset.id)).toBeDefined();
      });
  });

  describe("Emoji Fonts", () => {
      it("should have sample emoji fonts initialized", async () => {
          const fonts = await storage.getEmojiFonts();
          expect(fonts.length).toBeGreaterThan(0);
          expect(fonts.find(f => f.slug === 'default-caption')).toBeDefined();
      });

      it("should filter emoji fonts", async () => {
          const premiumFonts = await storage.getEmojiFonts({ visibility: "premium" });
          expect(premiumFonts.length).toBe(1);
          expect(premiumFonts[0].slug).toBe("neon-emoji");
      });

      it("should get a specific emoji font", async () => {
          const fonts = await storage.getEmojiFonts();
          const firstFontId = fonts[0].id;

          const font = await storage.getEmojiFont(firstFontId);
          expect(font).toBeDefined();
          expect(font?.id).toBe(firstFontId);
      });

      it("should return undefined for a non-existent emoji font", async () => {
          const font = await storage.getEmojiFont(9999);
          expect(font).toBeUndefined();
      });

      it("should create a new emoji font", async () => {
          const newFontData: InsertEmojiFont = {
              name: "Test Font",
              slug: "test-font",
              fontType: "ttf",
              visibility: "public",
              status: "draft"
          };

          const createdFont = await storage.createEmojiFont(newFontData);
          expect(createdFont.name).toBe("Test Font");
          expect(createdFont.id).toBeDefined();

          const font = await storage.getEmojiFont(createdFont.id);
          expect(font).toBeDefined();
          expect(font?.slug).toBe("test-font");
      });
  });

  describe("Emoji Font Glyphs", () => {
      it("should have sample emoji font glyphs for default font", async () => {
          const fonts = await storage.getEmojiFonts();
          const defaultFontId = fonts.find(f => f.slug === 'default-caption')?.id;
          expect(defaultFontId).toBeDefined();

          if(defaultFontId !== undefined) {
              const glyphs = await storage.getEmojiFontGlyphs(defaultFontId);
              expect(glyphs.length).toBeGreaterThan(0);
              expect(glyphs.find(g => g.glyphName === "sparkle")).toBeDefined();

              // Verify they are sorted
              if(glyphs.length > 1) {
                  expect((glyphs[0].sortOrder ?? 0)).toBeLessThanOrEqual((glyphs[1].sortOrder ?? 0));
              }
          }
      });

      it("should return empty array for non-existent font glyphs", async () => {
          const glyphs = await storage.getEmojiFontGlyphs(9999);
          expect(glyphs).toEqual([]);
      });

      it("should create a new emoji font glyph", async () => {
          const fonts = await storage.getEmojiFonts();
          const fontId = fonts[0].id;

          const newGlyphData: InsertEmojiFontGlyph = {
              fontId,
              glyphName: "New Glyph",
          };

          const createdGlyph = await storage.createEmojiFontGlyph(newGlyphData);
          expect(createdGlyph.glyphName).toBe("New Glyph");
          expect(createdGlyph.id).toBeDefined();

          const glyphs = await storage.getEmojiFontGlyphs(fontId);
          expect(glyphs.find(g => g.id === createdGlyph.id)).toBeDefined();
      });
  });
});

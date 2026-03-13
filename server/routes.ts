import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import {
  insertBotLogSchema,
  insertBotMetricsSchema,
  insertMeetingInsightsSchema,
  insertMagicCutUserSchema,
  insertCatalogMaskSchema,
  insertUserUploadSchema,
  insertCutJobSchema,
  insertMaskSubmissionSchema,
} from "@shared/schema";
import { AccessService } from "./magic-cut/access";
import { CatalogService } from "./magic-cut/catalog";
import { CutJobService } from "./magic-cut/cut-jobs";
import { SubmissionService } from "./magic-cut/submissions";

// Instantiate services (they share the same in-memory storage)
const accessService = new AccessService(storage);
const catalogService = new CatalogService(storage);
const cutJobService = new CutJobService(storage);
const submissionService = new SubmissionService(storage);

export async function registerRoutes(app: Express): Promise<Server> {
  // Dashboard API routes
  app.get("/api/bot/status", async (req, res) => {
    try {
      const metrics = await storage.getBotMetrics();
      const activeUsers = await storage.getActiveTelegramUsersCount();
      
      res.json({
        status: "online",
        metrics: metrics || {
          activeUsers,
          commandsToday: 0,
          totalCommands: 0,
          uptime: "0d 0h 0m"
        }
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch bot status" });
    }
  });

  app.get("/api/bot/logs", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const logs = await storage.getBotLogs(limit);
      res.json(logs);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch logs" });
    }
  });

  app.post("/api/bot/logs", async (req, res) => {
    try {
      const logData = insertBotLogSchema.parse(req.body);
      const log = await storage.createBotLog(logData);
      res.json(log);
    } catch (error) {
      res.status(400).json({ error: "Invalid log data" });
    }
  });

  app.post("/api/bot/metrics", async (req, res) => {
    try {
      const metricsData = insertBotMetricsSchema.parse(req.body);
      const metrics = await storage.updateBotMetrics(metricsData);
      res.json(metrics);
    } catch (error) {
      res.status(400).json({ error: "Invalid metrics data" });
    }
  });

  app.get("/api/environment/status", async (req, res) => {
    const envVars = {
      BOT_TOKEN: !!process.env.BOT_TOKEN,
      LOG_CHANNEL_ID: !!process.env.LOG_CHANNEL_ID,
      ZOOM_CLIENT_ID: !!process.env.ZOOM_CLIENT_ID,
      ZOOM_CLIENT_SECRET: !!process.env.ZOOM_CLIENT_SECRET,
      ZOOM_REDIRECT_URI: !!process.env.ZOOM_REDIRECT_URI,
    };
    
    res.json(envVars);
  });

  // Debug route for checking Zoom credentials format
  app.get("/api/zoom/debug", async (req, res) => {
    const clientId = process.env.ZOOM_USER_CLIENT_ID || process.env.ZOOM_CLIENT_ID;
    const clientSecret = process.env.ZOOM_USER_CLIENT_SECRET || process.env.ZOOM_CLIENT_SECRET;
    
    res.json({
      clientId: {
        exists: !!clientId,
        length: clientId?.length || 0,
        hasPipe: clientId?.includes('|') || false,
        firstChars: clientId?.substring(0, 15) || 'N/A',
        isValidFormat: clientId && clientId.length >= 20 && !clientId.includes('|')
      },
      clientSecret: {
        exists: !!clientSecret,
        length: clientSecret?.length || 0
      }
    });
  });

  // Zoom OAuth callback route
  app.get("/zoom/callback", async (req, res) => {
    try {
      const { code, state } = req.query;
      
      if (!code || !state) {
        return res.status(400).send("Missing authorization code or state");
      }

      console.log(`Zoom OAuth callback received for user ${state}`);
      
      // Import bot module to handle auth success
      const { handleZoomAuthSuccess } = require('../bot.cjs');
      
      // Exchange code for access token
      const { getAccessToken } = require('../zoomAuth.js');
      const tokenData = await getAccessToken(code as string);
      
      // Store token in database
      await storage.createZoomToken({
        telegramUserId: state as string,
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token,
        expiresAt: new Date(Date.now() + (tokenData.expires_in * 1000))
      });

      // Notify user via bot
      await handleZoomAuthSuccess(parseInt(state as string), tokenData.access_token);
      
      // Create bot log
      await storage.createBotLog({
        level: 'info',
        message: `Zoom OAuth completed successfully`,
        telegramUserId: state as string,
        command: 'zoom_auth_callback'
      });

      res.send(`
        <html>
          <head>
            <title>LA NUBE BOT - Authorization Successful</title>
            <meta charset="utf-8">
            <style>
              body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background: #f5f5f5; }
              .container { background: white; padding: 30px; border-radius: 10px; max-width: 400px; margin: 0 auto; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
              .success { color: #28a745; font-size: 48px; }
              h1 { color: #333; }
              p { color: #666; margin: 20px 0; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="success">✅</div>
              <h1>Authorization Successful!</h1>
              <p>Your Zoom account has been successfully connected to LA NUBE BOT.</p>
              <p>You can close this window and return to Telegram.</p>
            </div>
          </body>
        </html>
      `);
      
    } catch (error) {
      console.error(`Zoom OAuth error: ${error}`);
      
      await storage.createBotLog({
        level: 'error',
        message: `Zoom OAuth failed: ${error.message}`,
        telegramUserId: req.query.state as string,
        command: 'zoom_auth_callback'
      });

      res.status(500).send(`
        <html>
          <head>
            <title>LA NUBE BOT - Authorization Error</title>
            <meta charset="utf-8">
            <style>
              body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background: #f5f5f5; }
              .container { background: white; padding: 30px; border-radius: 10px; max-width: 400px; margin: 0 auto; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
              .error { color: #dc3545; font-size: 48px; }
              h1 { color: #333; }
              p { color: #666; margin: 20px 0; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="error">❌</div>
              <h1>Authorization Error</h1>
              <p>There was a problem connecting your Zoom account.</p>
              <p>Please try again from the Telegram bot.</p>
            </div>
          </body>
        </html>
      `);
    }
  });

  // Meeting Insights API routes
  app.get("/api/meetings/insights", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const insights = await storage.getMeetingInsights(limit);
      res.json(insights);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch meeting insights" });
    }
  });

  app.get("/api/meetings/active", async (req, res) => {
    try {
      const activeInsights = await storage.getActiveMeetingInsights();
      res.json(activeInsights);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch active meetings" });
    }
  });

  app.post("/api/meetings/insights", async (req, res) => {
    try {
      const insightData = insertMeetingInsightsSchema.parse(req.body);
      const insight = await storage.createMeetingInsight(insightData);
      res.json(insight);
    } catch (error) {
      res.status(400).json({ error: "Invalid meeting insight data" });
    }
  });

  app.patch("/api/meetings/insights/:meetingId", async (req, res) => {
    try {
      const { meetingId } = req.params;
      const updates = req.body;
      const insight = await storage.updateMeetingInsight(meetingId, updates);
      if (!insight) {
        return res.status(404).json({ error: "Meeting not found" });
      }
      res.json(insight);
    } catch (error) {
      res.status(400).json({ error: "Failed to update meeting insight" });
    }
  });

  app.post("/api/meetings/insights/:meetingId/end", async (req, res) => {
    try {
      const { meetingId } = req.params;
      const insight = await storage.endMeeting(meetingId);
      if (!insight) {
        return res.status(404).json({ error: "Meeting not found" });
      }
      res.json(insight);
    } catch (error) {
      res.status(400).json({ error: "Failed to end meeting" });
    }
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // MAGIC CUT API
  // ═══════════════════════════════════════════════════════════════════════════

  // ─── Catalog ──────────────────────────────────────────────────────────────

  /**
   * GET /api/catalog/masks
   * Returns masks available to the requesting user.
   * Query params: category, status, userId (optional, defaults to free access)
   */
  app.get("/api/catalog/masks", async (req, res) => {
    try {
      const userId = req.query.userId ? parseInt(req.query.userId as string) : 0;
      const access = userId
        ? await accessService.getUserAccess(userId)
        : await accessService.getUserAccess(0); // defaults to free

      const masks = await catalogService.listMasks(access, {
        category: req.query.category as string | undefined,
        status: req.query.status as string | undefined,
      });
      res.json(masks);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch catalog masks" });
    }
  });

  /**
   * GET /api/catalog/masks/:id
   */
  app.get("/api/catalog/masks/:id", async (req, res) => {
    try {
      const mask = await catalogService.getMask(parseInt(req.params.id));
      if (!mask) return res.status(404).json({ error: "Mask not found" });
      res.json(mask);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch mask" });
    }
  });

  // ─── Uploads ──────────────────────────────────────────────────────────────

  /**
   * POST /api/uploads
   * Body: { userId, originalFileUrl, fileType? }
   */
  app.post("/api/uploads", async (req, res) => {
    try {
      const data = insertUserUploadSchema.parse(req.body);
      const upload = await storage.createUserUpload(data);
      res.status(201).json(upload);
    } catch (error) {
      res.status(400).json({ error: "Invalid upload data" });
    }
  });

  /**
   * GET /api/uploads/:id
   */
  app.get("/api/uploads/:id", async (req, res) => {
    try {
      const upload = await storage.getUserUpload(parseInt(req.params.id));
      if (!upload) return res.status(404).json({ error: "Upload not found" });
      res.json(upload);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch upload" });
    }
  });

  // ─── Cut Jobs ─────────────────────────────────────────────────────────────

  /**
   * POST /api/cut-jobs
   * Body: { user_id, upload_id, mask_id }
   * Creates a job and enqueues it for processing.
   */
  app.post("/api/cut-jobs", async (req, res) => {
    try {
      // Accept snake_case from API consumers
      const body = {
        userId: req.body.user_id ?? req.body.userId,
        uploadId: req.body.upload_id ?? req.body.uploadId,
        maskId: req.body.mask_id ?? req.body.maskId,
      };
      const data = insertCutJobSchema.parse(body);

      // Check access before creating the job
      const allowed = await accessService.isAllowed(
        (await storage.getMagicCutUser(data.userId))?.planId ?? 1,
        "cut_job",
        "create",
      );
      if (!allowed) {
        return res.status(403).json({ error: "Your plan does not allow cut jobs" });
      }

      const job = await cutJobService.createJob(data);
      res.status(201).json(job);
    } catch (error) {
      res.status(400).json({ error: "Invalid cut job data" });
    }
  });

  /**
   * GET /api/cut-jobs/:id
   */
  app.get("/api/cut-jobs/:id", async (req, res) => {
    try {
      const job = await cutJobService.getJob(parseInt(req.params.id));
      if (!job) return res.status(404).json({ error: "Cut job not found" });
      res.json(job);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch cut job" });
    }
  });

  /**
   * GET /api/cut-jobs/user/:userId
   */
  app.get("/api/cut-jobs/user/:userId", async (req, res) => {
    try {
      const jobs = await cutJobService.getJobsByUser(parseInt(req.params.userId));
      res.json(jobs);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch user cut jobs" });
    }
  });

  // ─── Mask Submissions ─────────────────────────────────────────────────────

  /**
   * POST /api/mask-submissions
   * Body: { userId, name, description?, previewImageUrl?, maskFileUrl? }
   */
  app.post("/api/mask-submissions", async (req, res) => {
    try {
      const data = insertMaskSubmissionSchema.parse(req.body);

      // Verify the user's plan allows custom submissions
      const user = await storage.getMagicCutUser(data.userId);
      const allowed = await accessService.isAllowed(
        user?.planId ?? 1,
        "custom_submission",
        "create",
      );
      if (!allowed) {
        return res.status(403).json({ error: "Your plan does not allow mask submissions" });
      }

      const submission = await submissionService.createSubmission(data);
      res.status(201).json(submission);
    } catch (error) {
      res.status(400).json({ error: "Invalid submission data" });
    }
  });

  /**
   * GET /api/mask-submissions/:id
   */
  app.get("/api/mask-submissions/:id", async (req, res) => {
    try {
      const sub = await submissionService.getSubmission(parseInt(req.params.id));
      if (!sub) return res.status(404).json({ error: "Submission not found" });
      res.json(sub);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch submission" });
    }
  });

  /**
   * GET /api/mask-submissions/user/:userId
   */
  app.get("/api/mask-submissions/user/:userId", async (req, res) => {
    try {
      const subs = await submissionService.getSubmissionsByUser(parseInt(req.params.userId));
      res.json(subs);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch user submissions" });
    }
  });

  // ─── Access / Permissions ─────────────────────────────────────────────────

  /**
   * GET /api/access/me?userId=:id
   * Returns the current user's access summary (plan + permissions + visibilities).
   */
  app.get("/api/access/me", async (req, res) => {
    try {
      const userId = parseInt((req.query.userId as string) ?? "0");
      const access = await accessService.getUserAccess(userId);
      res.json(access);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch access info" });
    }
  });

  /**
   * GET /api/access/catalog?userId=:id
   * Returns what catalog visibilities the user can browse.
   */
  app.get("/api/access/catalog", async (req, res) => {
    try {
      const userId = parseInt((req.query.userId as string) ?? "0");
      const access = await accessService.getUserAccess(userId);
      res.json({ visibilities: access.visibleVisibilities });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch catalog access" });
    }
  });

  // ─── Magic Cut: Users ─────────────────────────────────────────────────────

  /**
   * POST /api/magic-cut/users
   * Create or identify a Magic Cut user.
   */
  app.post("/api/magic-cut/users", async (req, res) => {
    try {
      const data = insertMagicCutUserSchema.parse(req.body);
      // Upsert by telegramId if provided
      if (data.telegramId) {
        const existing = await storage.getMagicCutUserByTelegramId(data.telegramId);
        if (existing) return res.json(existing);
      }
      const user = await storage.createMagicCutUser(data);
      res.status(201).json(user);
    } catch (error) {
      res.status(400).json({ error: "Invalid user data" });
    }
  });

  /**
   * GET /api/magic-cut/users/:id
   */
  app.get("/api/magic-cut/users/:id", async (req, res) => {
    try {
      const user = await storage.getMagicCutUser(parseInt(req.params.id));
      if (!user) return res.status(404).json({ error: "User not found" });
      res.json(user);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch user" });
    }
  });

  // ─── Admin: Submissions ───────────────────────────────────────────────────

  /**
   * GET /api/admin/submissions
   * List all pending (or all) mask submissions.
   * Query param: status (defaults to "pending_review")
   */
  app.get("/api/admin/submissions", async (req, res) => {
    try {
      const status = (req.query.status as string) || "pending_review";
      const subs = status === "all"
        ? await submissionService.listAllSubmissions()
        : await submissionService.listPendingSubmissions();
      res.json(subs);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch submissions" });
    }
  });

  /**
   * PATCH /api/admin/submissions/:id/review
   * Body: { verdict: "approved" | "rejected" | "needs_changes", reviewNotes? }
   */
  app.patch("/api/admin/submissions/:id/review", async (req, res) => {
    try {
      const { verdict, reviewNotes } = req.body;
      if (!["approved", "rejected", "needs_changes"].includes(verdict)) {
        return res.status(400).json({ error: "Invalid verdict" });
      }
      const updated = await submissionService.reviewSubmission(
        parseInt(req.params.id),
        verdict,
        reviewNotes,
      );
      if (!updated) return res.status(404).json({ error: "Submission not found" });
      res.json(updated);
    } catch (error) {
      res.status(400).json({ error: "Failed to review submission" });
    }
  });

  /**
   * POST /api/admin/catalog/publish-from-submission/:id
   * Publishes an approved submission to the public catalog.
   */
  app.post("/api/admin/catalog/publish-from-submission/:id", async (req, res) => {
    try {
      const updated = await submissionService.publishToCatalog(parseInt(req.params.id));
      if (!updated) {
        return res.status(400).json({
          error: "Submission not found or not in approved state",
        });
      }
      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: "Failed to publish submission" });
    }
  });

  // ─── Admin: Catalog management ────────────────────────────────────────────

  /**
   * POST /api/admin/catalog/masks
   * Directly add a mask to the catalog (admin only).
   */
  app.post("/api/admin/catalog/masks", async (req, res) => {
    try {
      const data = insertCatalogMaskSchema.parse(req.body);
      const mask = await storage.createCatalogMask(data);
      res.status(201).json(mask);
    } catch (error) {
      res.status(400).json({ error: "Invalid mask data" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

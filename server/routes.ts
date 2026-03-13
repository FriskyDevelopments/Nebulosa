import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertBotLogSchema, insertBotMetricsSchema, insertMeetingInsightsSchema } from "@shared/schema";
import { registerSubscriptionRoutes } from "./subscription-routes";

export async function registerRoutes(app: Express): Promise<Server> {
  // Register subscription routes (plans, checkout, webhook, user lookup)
  registerSubscriptionRoutes(app);

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

  const httpServer = createServer(app);
  return httpServer;
}

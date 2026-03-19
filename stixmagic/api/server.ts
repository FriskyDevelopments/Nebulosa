import "dotenv/config";
import express, { Request, Response, NextFunction } from "express";
import usersRouter from "./routes/users.js";
import subscriptionRouter from "./routes/subscription.js";

const app = express();
const PORT = process.env.PORT ?? 3000;

// Capture raw body for Stripe webhook signature verification
// Must be registered BEFORE express.json()
app.use(
  "/api/subscription/webhook",
  express.raw({ type: "application/json" }),
  (req: Request & { rawBody?: Buffer }, _res: Response, next: NextFunction) => {
    req.rawBody = req.body as Buffer;
    next();
  }
);

// Parse JSON for all other routes
app.use(express.json());

// Health check
app.get("/health", (_req: Request, res: Response) => {
  res.json({ status: "ok", service: "stixmagic-api" });
});

// Mount routers
app.use("/api/users", usersRouter);
app.use("/api/subscription", subscriptionRouter);

// Global error handler
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ error: "Internal server error" });
});

app.listen(PORT, () => {
  console.log(`🪄 Stix Magic API running on port ${PORT}`);
});

export default app;

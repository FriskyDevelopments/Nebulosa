/**
 * Express application factory.
 * Creates and configures the Express app without starting the server.
 * This allows the app to be imported in tests.
 */
'use strict';

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const rateLimit = require('express-rate-limit');

const config = require('../core/config');

const healthRoutes = require('./routes/health.routes');
const authRoutes = require('./routes/auth.routes');
const usersRoutes = require('./routes/users.routes');
const contentRoutes = require('./routes/content.routes');
const mediaRoutes = require('./routes/media.routes');
const analyticsRoutes = require('./routes/analytics.routes');
const integrationsRoutes = require('./routes/integrations.routes');

const { errorHandler, notFound } = require('./middleware/error-handler');
const { requestContext } = require('./middleware/request-context');

/**
 * Create and configure an Express application instance with security, parsing, request context, rate limiting, routes, and error handling.
 *
 * The returned app is configured but not started (no HTTP server is created or bound).
 *
 * @returns {import('express').Application} An Express application configured with middleware and route handlers.
 */
function createApp() {
  const app = express();

  // ----- Security & transport middleware -----
  app.use(helmet());
  app.use(cors({ origin: config.cors.origins, credentials: true }));
  app.use(compression());

  // ----- Parsing -----
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // ----- Request context + structured HTTP logs -----
  app.use(requestContext);

  // ----- Rate limiting -----
  const limiter = rateLimit({
    windowMs: config.rateLimit.windowMs,
    max: config.rateLimit.max,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests, please try again later.' },
  });
  app.use(limiter);

  // ----- Routes -----
  app.use('/health', healthRoutes);
  app.use('/auth', authRoutes);
  app.use('/users', usersRoutes);
  app.use('/content', contentRoutes);
  app.use('/media', mediaRoutes);
  app.use('/analytics', analyticsRoutes);
  app.use('/integrations', integrationsRoutes);

  // ----- Error handling -----
  app.use(notFound);
  app.use(errorHandler);

  return app;
}

module.exports = { createApp };

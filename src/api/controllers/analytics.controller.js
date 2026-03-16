/**
 * Analytics controller – event tracking and metrics endpoints.
 */
'use strict';

const { AnalyticsService } = require('../../services/analytics-service');
const { asyncHandler, parsePagination, paginationMeta } = require('../../core/utilities');

class AnalyticsController {
  constructor() {
    this.analyticsService = new AnalyticsService();
  }

  track = asyncHandler(async (req, res) => {
    const { event, properties, sessionId } = req.body;
    if (!event) {
      return res.status(400).json({ error: 'event is required' });
    }

    const record = await this.analyticsService.track({
      event,
      userId: req.user?.id,
      properties: properties || {},
      sessionId,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    return res.status(201).json({ record });
  });

  list = asyncHandler(async (req, res) => {
    const { page, limit } = parsePagination(req);
    const { userId, event, from, to } = req.query;
    const { items, total } = await this.analyticsService.list({
      userId, event, from, to, page, limit,
    });
    return res.status(200).json({ items, meta: paginationMeta(total, page, limit) });
  });

  aggregate = asyncHandler(async (req, res) => {
    const { event, from, to } = req.query;
    if (!event) {
      return res.status(400).json({ error: 'event query parameter is required' });
    }
    const count = await this.analyticsService.aggregate({ event, from, to });
    return res.status(200).json({ event, count });
  });
}

module.exports = { AnalyticsController };

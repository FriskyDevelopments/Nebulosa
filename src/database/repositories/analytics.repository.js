/**
 * Analytics repository – data-access layer for analytics_events table.
 */
'use strict';

const { getPrismaClient } = require('../client');

class AnalyticsRepository {
  constructor() {
    this.db = getPrismaClient();
  }

  async track(data) {
    return this.db.analyticsEvent.create({ data });
  }

  async list({ userId, event, from, to, offset = 0, limit = 100 } = {}) {
    const where = {};
    if (userId) where.userId = userId;
    if (event) where.event = event;
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(from);
      if (to) where.createdAt.lte = new Date(to);
    }

    const [items, total] = await this.db.$transaction([
      this.db.analyticsEvent.findMany({
        where,
        skip: offset,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.db.analyticsEvent.count({ where }),
    ]);
    return { items, total };
  }

  async aggregate({ event, from, to } = {}) {
    const where = { event };
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(from);
      if (to) where.createdAt.lte = new Date(to);
    }
    return this.db.analyticsEvent.count({ where });
  }
}

module.exports = { AnalyticsRepository };

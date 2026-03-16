/**
 * Analytics service – tracks events and aggregates metrics.
 */
'use strict';

const { AnalyticsRepository } = require('../../database/repositories/analytics.repository');
const { withContext } = require('../../core/logger');

const log = withContext({ module: 'analytics-service' });

class AnalyticsService {
  constructor() {
    this.analyticsRepo = new AnalyticsRepository();
  }

  /**
   * Tracks an analytics event.
   * @param {{ event: string, userId?: string, properties?: object, sessionId?: string, ipAddress?: string, userAgent?: string }} data
   */
  async track({ event, userId, properties = {}, sessionId, ipAddress, userAgent }) {
    const record = await this.analyticsRepo.track({
      event,
      userId: userId || null,
      properties,
      sessionId: sessionId || null,
      ipAddress: ipAddress || null,
      userAgent: userAgent || null,
    });
    log.debug('Analytics event tracked', { event, userId });
    return record;
  }

  /**
   * Lists events with optional filters.
   * @param {{ userId?: string, event?: string, from?: string, to?: string, page?: number, limit?: number }} options
   */
  async list({ userId, event, from, to, page = 1, limit = 100 } = {}) {
    const offset = (page - 1) * limit;
    return this.analyticsRepo.list({ userId, event, from, to, offset, limit });
  }

  /**
   * Returns aggregated event counts.
   * @param {{ event: string, from?: string, to?: string }} options
   */
  async aggregate({ event, from, to } = {}) {
    return this.analyticsRepo.aggregate({ event, from, to });
  }
}

module.exports = { AnalyticsService };

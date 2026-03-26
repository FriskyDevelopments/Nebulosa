/**
 * Activity log repository – append-only audit trail.
 */
'use strict';

const { getPrismaClient } = require('../client');

class ActivityLogRepository {
  constructor() {
    this.db = getPrismaClient();
  }

  async create({ userId, action, resource, resourceId, details, ipAddress }) {
    return this.db.activityLog.create({
      data: { userId, action, resource, resourceId, details, ipAddress },
    });
  }

  async list({ userId, resource, offset = 0, limit = 50 } = {}) {
    const where = {};
    if (userId) where.userId = userId;
    if (resource) where.resource = resource;

    const [items, total] = await this.db.$transaction([
      this.db.activityLog.findMany({
        where,
        skip: offset,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.db.activityLog.count({ where }),
    ]);
    return { items, total };
  }
}

module.exports = { ActivityLogRepository };

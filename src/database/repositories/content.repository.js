/**
 * Content repository – data-access layer for the content table.
 */
'use strict';

const { getPrismaClient } = require('../client');

class ContentRepository {
  constructor() {
    this.db = getPrismaClient();
  }

  async findById(id) {
    return this.db.content.findUnique({ where: { id }, include: { media: true } });
  }

  async create(data) {
    return this.db.content.create({ data });
  }

  async update(id, data) {
    return this.db.content.update({ where: { id }, data });
  }

  async delete(id) {
    return this.db.content.update({ where: { id }, data: { status: 'DELETED' } });
  }

  async list({ userId, status, offset = 0, limit = 20 } = {}) {
    const where = {};
    if (userId) where.userId = userId;
    if (status) where.status = status;

    const [items, total] = await this.db.$transaction([
      this.db.content.findMany({
        where,
        skip: offset,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { media: true },
      }),
      this.db.content.count({ where }),
    ]);
    return { items, total };
  }
}

module.exports = { ContentRepository };

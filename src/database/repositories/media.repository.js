/**
 * Media repository – data-access layer for the media table.
 */
'use strict';

const { getPrismaClient } = require('../client');

class MediaRepository {
  constructor() {
    this.db = getPrismaClient();
  }

  async findById(id) {
    return this.db.media.findUnique({ where: { id } });
  }

  async findByStorageKey(storageKey) {
    return this.db.media.findUnique({ where: { storageKey } });
  }

  async create(data) {
    return this.db.media.create({ data });
  }

  async update(id, data) {
    return this.db.media.update({ where: { id }, data });
  }

  async updateStatus(id, status) {
    return this.db.media.update({ where: { id }, data: { status } });
  }

  async list({ contentId, status, offset = 0, limit = 20 } = {}) {
    const where = {};
    if (contentId) where.contentId = contentId;
    if (status) where.status = status;

    const [items, total] = await this.db.$transaction([
      this.db.media.findMany({ where, skip: offset, take: limit, orderBy: { createdAt: 'desc' } }),
      this.db.media.count({ where }),
    ]);
    return { items, total };
  }
}

module.exports = { MediaRepository };

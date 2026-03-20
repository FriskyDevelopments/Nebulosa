/**
 * Content service – business logic for content management.
 */
'use strict';

const { ContentRepository } = require('../../database/repositories/content.repository');
const { withContext } = require('../../core/logger');

const log = withContext({ module: 'content-service' });

class ContentService {
  constructor() {
    this.contentRepo = new ContentRepository();
  }

  async create({ userId, title, body, type = 'TEXT', tags = [], metadata = {} }) {
    const content = await this.contentRepo.create({ userId, title, body, type, tags, metadata });
    log.info('Content created', { contentId: content.id, userId });
    return content;
  }

  async getById(id) {
    const content = await this.contentRepo.findById(id);
    if (!content || content.status === 'DELETED') {
      const err = new Error('Content not found');
      err.status = 404;
      throw err;
    }
    return content;
  }

  async update(id, requesterId, data) {
    const content = await this.getById(id);
    if (content.userId !== requesterId) {
      const err = new Error('Forbidden');
      err.status = 403;
      throw err;
    }
    return this.contentRepo.update(id, data);
  }

  async publish(id, requesterId) {
    return this.update(id, requesterId, { status: 'PUBLISHED', publishedAt: new Date() });
  }

  async delete(id, requesterId) {
    const content = await this.getById(id);
    if (content.userId !== requesterId) {
      const err = new Error('Forbidden');
      err.status = 403;
      throw err;
    }
    return this.contentRepo.delete(id);
  }

  async list({ userId, status, page = 1, limit = 20 } = {}) {
    const offset = (page - 1) * limit;
    return this.contentRepo.list({ userId, status, offset, limit });
  }
}

module.exports = { ContentService };

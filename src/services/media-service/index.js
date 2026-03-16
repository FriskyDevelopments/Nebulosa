/**
 * Media service – handles media upload metadata and processing orchestration.
 */
'use strict';

const path = require('path');
const { MediaRepository } = require('../../database/repositories/media.repository');
const { withContext } = require('../../core/logger');
const { generateId } = require('../../core/utilities');

const log = withContext({ module: 'media-service' });

class MediaService {
  constructor() {
    this.mediaRepo = new MediaRepository();
  }

  /**
   * Records media metadata after upload.
   * @param {{ filename: string, mimeType: string, sizeBytes: number, contentId?: string }} data
   */
  async create({ filename, mimeType, sizeBytes, contentId }) {
    const storageKey = `${generateId()}${path.extname(filename)}`;
    const media = await this.mediaRepo.create({
      filename,
      mimeType,
      sizeBytes,
      storageKey,
      contentId: contentId || null,
      status: 'PENDING',
    });
    log.info('Media record created', { mediaId: media.id, mimeType });
    return media;
  }

  async getById(id) {
    const media = await this.mediaRepo.findById(id);
    if (!media) {
      const err = new Error('Media not found');
      err.status = 404;
      throw err;
    }
    return media;
  }

  async markReady(id, { storageUrl, width, height, durationMs, thumbnailUrl } = {}) {
    return this.mediaRepo.update(id, {
      status: 'READY',
      storageUrl,
      width,
      height,
      durationMs,
      thumbnailUrl,
    });
  }

  async markFailed(id) {
    return this.mediaRepo.updateStatus(id, 'FAILED');
  }

  async list({ contentId, status, page = 1, limit = 20 } = {}) {
    const offset = (page - 1) * limit;
    return this.mediaRepo.list({ contentId, status, offset, limit });
  }
}

module.exports = { MediaService };

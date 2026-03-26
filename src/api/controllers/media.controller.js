/**
 * Media controller – handles media metadata endpoints.
 */
'use strict';

const { MediaService } = require('../../services/media-service');
const { asyncHandler, parsePagination, paginationMeta } = require('../../core/utilities');

class MediaController {
  constructor() {
    this.mediaService = new MediaService();
  }

  list = asyncHandler(async (req, res) => {
    const { page, limit } = parsePagination(req);
    const { contentId, status } = req.query;
    const { items, total } = await this.mediaService.list({ contentId, status, page, limit });
    return res.status(200).json({ items, meta: paginationMeta(total, page, limit) });
  });

  getById = asyncHandler(async (req, res) => {
    const media = await this.mediaService.getById(req.params.id);
    return res.status(200).json({ media });
  });

  upload = asyncHandler(async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const media = await this.mediaService.create({
      filename: req.file.originalname,
      mimeType: req.file.mimetype,
      sizeBytes: req.file.size,
      contentId: req.body.contentId || null,
    });

    return res.status(201).json({ media });
  });
}

module.exports = { MediaController };

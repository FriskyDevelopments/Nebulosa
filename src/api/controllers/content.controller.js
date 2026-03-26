/**
 * Content controller – CRUD for content objects.
 */
'use strict';

const { ContentService } = require('../../services/content-service');
const { asyncHandler, parsePagination, paginationMeta } = require('../../core/utilities');

class ContentController {
  constructor() {
    this.contentService = new ContentService();
  }

  list = asyncHandler(async (req, res) => {
    const { page, limit } = parsePagination(req);
    const { userId, status } = req.query;
    const { items, total } = await this.contentService.list({ userId, status, page, limit });
    return res.status(200).json({ items, meta: paginationMeta(total, page, limit) });
  });

  getById = asyncHandler(async (req, res) => {
    const content = await this.contentService.getById(req.params.id);
    return res.status(200).json({ content });
  });

  create = asyncHandler(async (req, res) => {
    const content = await this.contentService.create({ ...req.body, userId: req.user.id });
    return res.status(201).json({ content });
  });

  update = asyncHandler(async (req, res) => {
    const content = await this.contentService.update(req.params.id, req.user.id, req.body);
    return res.status(200).json({ content });
  });

  publish = asyncHandler(async (req, res) => {
    const content = await this.contentService.publish(req.params.id, req.user.id);
    return res.status(200).json({ content });
  });

  delete = asyncHandler(async (req, res) => {
    await this.contentService.delete(req.params.id, req.user.id);
    return res.status(204).send();
  });
}

module.exports = { ContentController };

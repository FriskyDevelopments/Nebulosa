/**
 * Users controller – CRUD operations for user accounts.
 */
'use strict';

const { UserService } = require('../../services/user-service');
const { asyncHandler, parsePagination, paginationMeta } = require('../../core/utilities');

class UsersController {
  constructor() {
    this.userService = new UserService();
  }

  list = asyncHandler(async (req, res) => {
    const { page, limit } = parsePagination(req);
    const { items, total } = await this.userService.list({ page, limit });
    return res.status(200).json({ items, meta: paginationMeta(total, page, limit) });
  });

  getById = asyncHandler(async (req, res) => {
    const user = await this.userService.getById(req.params.id);
    return res.status(200).json({ user });
  });

  update = asyncHandler(async (req, res) => {
    const { id } = req.params;
    // Users can update themselves; admins can update anyone
    if (req.user.id !== id && req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const user = await this.userService.update(id, req.body);
    return res.status(200).json({ user });
  });
}

module.exports = { UsersController };

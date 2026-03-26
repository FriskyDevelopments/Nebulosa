/**
 * User repository – data-access layer for the users table.
 */
'use strict';

const { getPrismaClient } = require('../client');

class UserRepository {
  constructor() {
    this.db = getPrismaClient();
  }

  /**
   * Finds a user by their unique ID.
   * @param {string} id
   */
  async findById(id) {
    return this.db.user.findUnique({ where: { id } });
  }

  /**
   * Finds a user by their email address.
   * @param {string} email
   */
  async findByEmail(email) {
    return this.db.user.findUnique({ where: { email } });
  }

  /**
   * Finds a user by their username.
   * @param {string} username
   */
  async findByUsername(username) {
    return this.db.user.findUnique({ where: { username } });
  }

  /**
   * Creates a new user.
   * @param {{ email: string, username: string, passwordHash: string, role?: string }} data
   */
  async create(data) {
    return this.db.user.create({ data });
  }

  /**
   * Updates fields on an existing user.
   * @param {string} id
   * @param {Partial<import('@prisma/client').User>} data
   */
  async update(id, data) {
    return this.db.user.update({ where: { id }, data });
  }

  /**
   * Soft-deletes a user by setting isActive to false.
   * @param {string} id
   */
  async deactivate(id) {
    return this.db.user.update({ where: { id }, data: { isActive: false } });
  }

  /**
   * Lists users with pagination.
   * @param {{ offset?: number, limit?: number }} options
   */
  async list({ offset = 0, limit = 20 } = {}) {
    const [items, total] = await this.db.$transaction([
      this.db.user.findMany({ skip: offset, take: limit, orderBy: { createdAt: 'desc' } }),
      this.db.user.count(),
    ]);
    return { items, total };
  }
}

module.exports = { UserRepository };

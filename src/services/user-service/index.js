/**
 * User service – business logic for user management.
 */
'use strict';

const { UserRepository } = require('../../database/repositories/user.repository');
const { hashPassword, comparePassword, signAccessToken, signRefreshToken } = require('../../auth/authentication');
const { generateId, omit } = require('../../core/utilities');
const { withContext } = require('../../core/logger');

const log = withContext({ module: 'user-service' });

class UserService {
  constructor() {
    this.userRepo = new UserRepository();
  }

  /**
   * Registers a new user.
   * @param {{ email: string, username: string, password: string }} data
   */
  async register({ email, username, password }) {
    const existing = await this.userRepo.findByEmail(email);
    if (existing) {
      const err = new Error('Email already in use');
      err.status = 409;
      throw err;
    }

    const existingUsername = await this.userRepo.findByUsername(username);
    if (existingUsername) {
      const err = new Error('Username already taken');
      err.status = 409;
      throw err;
    }

    const passwordHash = await hashPassword(password);
    const user = await this.userRepo.create({ email, username, passwordHash });

    log.info('User registered', { userId: user.id });
    return omit(user, ['passwordHash']);
  }

  /**
   * Authenticates a user by email and password.
   * @param {{ email: string, password: string }} credentials
   * @returns {{ user: object, accessToken: string, refreshToken: string }}
   */
  async login({ email, password }) {
    const user = await this.userRepo.findByEmail(email);
    if (!user || !user.isActive) {
      const err = new Error('Invalid credentials');
      err.status = 401;
      throw err;
    }

    const valid = await comparePassword(password, user.passwordHash);
    if (!valid) {
      const err = new Error('Invalid credentials');
      err.status = 401;
      throw err;
    }

    const accessToken = signAccessToken(user);
    const refreshToken = signRefreshToken(user.id);

    log.info('User logged in', { userId: user.id });
    return { user: omit(user, ['passwordHash']), accessToken, refreshToken };
  }

  /**
   * Returns a user by ID (without sensitive fields).
   * @param {string} id
   */
  async getById(id) {
    const user = await this.userRepo.findById(id);
    if (!user) {
      const err = new Error('User not found');
      err.status = 404;
      throw err;
    }
    return omit(user, ['passwordHash']);
  }

  /**
   * Updates a user's profile.
   * @param {string} id
   * @param {{ username?: string, email?: string }} data
   */
  async update(id, data) {
    const user = await this.userRepo.update(id, data);
    return omit(user, ['passwordHash']);
  }

  /**
   * Lists users with pagination.
   * @param {{ page?: number, limit?: number }} options
   */
  async list({ page = 1, limit = 20 } = {}) {
    const offset = (page - 1) * limit;
    const { items, total } = await this.userRepo.list({ offset, limit });
    return { items: items.map((u) => omit(u, ['passwordHash'])), total };
  }
}

module.exports = { UserService };

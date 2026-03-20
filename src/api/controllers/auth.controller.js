/**
 * Auth controller – handles registration, login and token refresh.
 */
'use strict';

const { z } = require('zod');
const { UserService } = require('../../services/user-service');
const { verifyToken, signAccessToken } = require('../../auth/authentication');
const { asyncHandler } = require('../../core/utilities');

const registerSchema = z.object({
  email: z.string().email(),
  username: z.string().min(3).max(32).regex(/^[a-zA-Z0-9_-]+$/),
  password: z.string().min(8).max(128),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

class AuthController {
  constructor() {
    this.userService = new UserService();
  }

  register = asyncHandler(async (req, res) => {
    const data = registerSchema.parse(req.body);
    const user = await this.userService.register(data);
    return res.status(201).json({ user });
  });

  login = asyncHandler(async (req, res) => {
    const data = loginSchema.parse(req.body);
    const result = await this.userService.login(data);
    return res.status(200).json(result);
  });

  refresh = asyncHandler(async (req, res) => {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({ error: 'Refresh token required' });
    }

    let payload;
    try {
      payload = verifyToken(refreshToken);
    } catch {
      return res.status(401).json({ error: 'Invalid or expired refresh token' });
    }

    if (payload.type !== 'refresh') {
      return res.status(401).json({ error: 'Invalid token type' });
    }

    const user = await this.userService.getById(payload.sub);
    const accessToken = signAccessToken(user);
    return res.status(200).json({ accessToken });
  });

  me = asyncHandler(async (req, res) => {
    const user = await this.userService.getById(req.user.id);
    return res.status(200).json({ user });
  });
}

module.exports = { AuthController };

/**
 * Integrations routes – /integrations
 * Manages integration tokens for external services.
 */
'use strict';

const { Router } = require('express');
const { asyncHandler } = require('../../core/utilities');
const { authenticate } = require('../middleware/authenticate');
const { getPrismaClient } = require('../../database/client');

const router = Router();

router.get('/', authenticate, asyncHandler(async (req, res) => {
  const db = getPrismaClient();
  const tokens = await db.integrationToken.findMany({
    where: { userId: req.user.id },
    select: { id: true, provider: true, scopes: true, expiresAt: true, createdAt: true },
  });
  return res.status(200).json({ integrations: tokens });
}));

router.delete('/:id', authenticate, asyncHandler(async (req, res) => {
  const db = getPrismaClient();
  const token = await db.integrationToken.findFirst({
    where: { id: req.params.id, userId: req.user.id },
  });
  if (!token) {
    return res.status(404).json({ error: 'Integration not found' });
  }
  await db.integrationToken.delete({ where: { id: req.params.id } });
  return res.status(204).send();
}));

module.exports = router;

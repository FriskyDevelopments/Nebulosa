/**
 * Analytics routes – /analytics
 */
'use strict';

const { Router } = require('express');
const { AnalyticsController } = require('../controllers/analytics.controller');
const { authenticate, optionalAuthenticate } = require('../middleware/authenticate');
const { requireAdmin } = require('../../auth/authorization');

const router = Router();
const ctrl = new AnalyticsController();

router.post('/events', optionalAuthenticate, ctrl.track);
router.get('/events', authenticate, requireAdmin, ctrl.list);
router.get('/aggregate', authenticate, requireAdmin, ctrl.aggregate);

module.exports = router;

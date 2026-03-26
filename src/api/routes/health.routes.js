/**
 * Health routes – /health
 */
'use strict';

const { Router } = require('express');
const { healthCheck, readinessCheck } = require('../controllers/health.controller');

const router = Router();

router.get('/', healthCheck);
router.get('/ready', readinessCheck);

module.exports = router;

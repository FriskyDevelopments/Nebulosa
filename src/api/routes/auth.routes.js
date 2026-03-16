/**
 * Auth routes – /auth
 */
'use strict';

const { Router } = require('express');
const { AuthController } = require('../controllers/auth.controller');
const { authenticate } = require('../middleware/authenticate');

const router = Router();
const ctrl = new AuthController();

router.post('/register', ctrl.register);
router.post('/login', ctrl.login);
router.post('/refresh', ctrl.refresh);
router.get('/me', authenticate, ctrl.me);

module.exports = router;

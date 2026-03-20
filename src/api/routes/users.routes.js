/**
 * User routes – /users
 */
'use strict';

const { Router } = require('express');
const { UsersController } = require('../controllers/users.controller');
const { authenticate } = require('../middleware/authenticate');
const { requireAdmin } = require('../../auth/authorization');

const router = Router();
const ctrl = new UsersController();

router.get('/', authenticate, requireAdmin, ctrl.list);
router.get('/:id', authenticate, ctrl.getById);
router.patch('/:id', authenticate, ctrl.update);

module.exports = router;

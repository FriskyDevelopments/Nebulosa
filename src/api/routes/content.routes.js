/**
 * Content routes – /content
 */
'use strict';

const { Router } = require('express');
const { ContentController } = require('../controllers/content.controller');
const { authenticate, optionalAuthenticate } = require('../middleware/authenticate');

const router = Router();
const ctrl = new ContentController();

router.get('/', optionalAuthenticate, ctrl.list);
router.get('/:id', optionalAuthenticate, ctrl.getById);
router.post('/', authenticate, ctrl.create);
router.patch('/:id', authenticate, ctrl.update);
router.post('/:id/publish', authenticate, ctrl.publish);
router.delete('/:id', authenticate, ctrl.delete);

module.exports = router;

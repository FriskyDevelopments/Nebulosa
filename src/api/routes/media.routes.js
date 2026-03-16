/**
 * Media routes – /media
 */
'use strict';

const { Router } = require('express');
const multer = require('multer');
const { MediaController } = require('../controllers/media.controller');
const { authenticate } = require('../middleware/authenticate');
const config = require('../../core/config');

const router = Router();
const ctrl = new MediaController();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB
  fileFilter: (req, file, cb) => {
    const allowed = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'video/mp4', 'video/webm',
      'audio/mpeg', 'audio/ogg',
      'application/pdf',
    ];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported mime type: ${file.mimetype}`));
    }
  },
});

router.get('/', authenticate, ctrl.list);
router.get('/:id', authenticate, ctrl.getById);
router.post('/upload', authenticate, upload.single('file'), ctrl.upload);

module.exports = router;

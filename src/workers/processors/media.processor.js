/**
 * Media processor – handles Bull jobs from the media queue.
 */
'use strict';

const fs = require('fs/promises');
const { mediaQueue } = require('../queues');
const { MediaService } = require('../../services/media-service');
const { withContext } = require('../../core/logger');

const log = withContext({ module: 'media-processor' });
const mediaService = new MediaService();

/**
 * Deletes a filesystem path if provided, ignoring any errors.
 *
 * Attempts to unlink the file at `filePath`. If `filePath` is falsy or the unlink operation fails
 * (for example because the file is missing or due to a race condition), the function performs no action
 * and suppresses the error.
 *
 * @param {string|undefined|null} filePath - Path to the file to remove; falsy values are treated as no-op.
 * @param {string} label - Label for logging when path is missing.
 */
async function safeUnlink(filePath, label) {
  if (!filePath) {
    if (label) {
      log.warn(`Missing ${label} in job data; skipping cleanup`);
    }
    return;
  }

  try {
    await fs.unlink(filePath);
  } catch {
    // Ignore missing files and cleanup races.
  }
}

mediaQueue.process('process', async (job) => {
  const { mediaId, storageKey, tempInputPath, tempOutputPath } = job.data;
  log.info('Processing media', { jobId: job.id, mediaId });

  try {
    // In production: resize images, transcode video, extract metadata, etc.
    // For now: mark the media as ready after simulated processing.
    await mediaService.markReady(mediaId, {
      storageUrl: `/storage/${storageKey}`,
    });
    log.info('Media processing complete', { mediaId });
  } catch (err) {
    log.error('Media processing failed', { mediaId, error: err.message });
    await mediaService.markFailed(mediaId).catch(() => {});
    throw err;
  } finally {
    // Always clean up temporary artifacts to prevent disk leaks.
    await Promise.allSettled([
      safeUnlink(tempInputPath, 'tempInputPath'),
      safeUnlink(tempOutputPath, 'tempOutputPath'),
    ]);
  }
});

mediaQueue.on('failed', (job, err) => {
  log.error('Media job failed', { jobId: job.id, error: err.message });
});

module.exports = {};
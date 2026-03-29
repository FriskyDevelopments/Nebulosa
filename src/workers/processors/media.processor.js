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

async function safeUnlink(filePath) {
  if (!filePath) {
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
      safeUnlink(tempInputPath),
      safeUnlink(tempOutputPath),
    ]);
  }
});

mediaQueue.on('failed', (job, err) => {
  log.error('Media job failed', { jobId: job.id, error: err.message });
});

module.exports = {};

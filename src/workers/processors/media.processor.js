/**
 * Media processor – handles Bull jobs from the media queue.
 */
'use strict';

const { mediaQueue } = require('../queues');
const { MediaService } = require('../../services/media-service');
const { withContext } = require('../../core/logger');

const log = withContext({ module: 'media-processor' });
const mediaService = new MediaService();

mediaQueue.process('process', async (job) => {
  const { mediaId, storageKey, mimeType } = job.data;
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
  }
});

mediaQueue.on('failed', (job, err) => {
  log.error('Media job failed', { jobId: job.id, error: err.message });
});

module.exports = {};

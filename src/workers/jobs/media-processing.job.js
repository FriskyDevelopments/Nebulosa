/**
 * Media processing job – processes uploaded media files.
 * Enqueues work to the media-processing queue.
 */
'use strict';

const { mediaQueue } = require('../queues');
const { withContext } = require('../../core/logger');

const log = withContext({ module: 'media-job' });

/**
 * Enqueues a media processing job.
 * @param {{ mediaId: string, storageKey: string, mimeType: string, tempInputPath?: string, tempOutputPath?: string }} data
 * Job data payload containing mediaId and storageKey (required), plus optional tempInputPath and tempOutputPath for cleanup.
 */
async function enqueueMediaProcessing(data) {
  const job = await mediaQueue.add('process', data, { priority: 1 });
  log.info('Media processing job enqueued', { jobId: job.id, mediaId: data.mediaId });
  return job;
}

module.exports = { enqueueMediaProcessing };
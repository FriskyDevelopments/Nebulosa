/**
 * Queue setup using Bull (Redis-backed).
 * Exports pre-configured queue instances for each worker type.
 */
'use strict';

const Bull = require('bull');
const config = require('../../core/config');

/**
 * Creates a Bull queue with the shared Redis config.
 * @param {string} name
 * @returns {import('bull').Queue}
 */
function createQueue(name) {
  return new Bull(name, {
    redis: config.redis.url,
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: 'exponential', delay: 2000 },
      removeOnComplete: 100,
      removeOnFail: 500,
    },
  });
}

const mediaQueue = createQueue('media-processing');
const analyticsQueue = createQueue('analytics-aggregation');
const webhookQueue = createQueue('webhook-processing');
const scheduledQueue = createQueue('scheduled-tasks');

module.exports = { mediaQueue, analyticsQueue, webhookQueue, scheduledQueue, createQueue };

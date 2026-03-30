/**
 * Queue setup using Bull (Redis-backed).
 * Exports pre-configured queue instances for each worker type.
 */
'use strict';

const Bull = require('bull');
const config = require('../../core/config');

/**
 * Creates a Bull queue configured to use the module Redis URL and sensible defaults.
 * @param {string} name - The queue name.
 * @returns {import('bull').Queue} The configured Bull Queue instance.
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
    settings: {
      stalledInterval: 30000,
      guardInterval: 5000,
      retryProcessDelay: 2000,
      drainDelay: 5,
    },
  });
}

const mediaQueue = createQueue('media-processing');
const analyticsQueue = createQueue('analytics-aggregation');
const webhookQueue = createQueue('webhook-processing');
const scheduledQueue = createQueue('scheduled-tasks');

const allQueues = [mediaQueue, analyticsQueue, webhookQueue, scheduledQueue];

/**
 * Waits for all configured queues to finish closing.
 *
 * Waits for every configured Bull queue's close operation to settle; individual close failures are not propagated.
 */
async function closeAllQueues() {
  await Promise.allSettled(allQueues.map((queue) => queue.close()));
}

module.exports = {
  mediaQueue,
  analyticsQueue,
  webhookQueue,
  scheduledQueue,
  createQueue,
  allQueues,
  closeAllQueues,
};

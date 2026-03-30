/**
 * Queue setup using Bull (Redis-backed).
 * Exports pre-configured queue instances for each worker type.
 */
'use strict';

const Bull = require('bull');
const config = require('../../core/config');
const { withContext } = require('../../core/logger');

const log = withContext({ module: 'queues' });

/**
 * Create a Bull queue preconfigured to use the module Redis URL and sensible defaults.
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

const allQueues = [mediaQueue, analyticsQueue, webhookQueue];

/**
 * Close every configured Bull queue and wait for each close attempt to complete.
 *
 * Waits for all queue close operations to settle; logs any failures with context.
 * Individual close failures do not cause this function to throw.
 * @returns {PromiseSettledResult[]} Array of settled results from closing all queues.
 */
async function closeAllQueues() {
  const results = await Promise.allSettled(allQueues.map((queue) => queue.close()));

  results.forEach((result, index) => {
    if (result.status === 'rejected') {
      const queueName = allQueues[index]?.name || `queue-${index}`;
      log.error('Failed to close queue', { queueName, error: result.reason?.message || result.reason });
    }
  });

  return results;
}

module.exports = {
  mediaQueue,
  analyticsQueue,
  webhookQueue,
  createQueue,
  allQueues,
  closeAllQueues,
};
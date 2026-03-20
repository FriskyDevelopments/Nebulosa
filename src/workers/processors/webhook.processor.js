/**
 * Webhook processor – handles incoming webhook events from external services.
 */
'use strict';

const { webhookQueue } = require('../queues');
const { withContext } = require('../../core/logger');

const log = withContext({ module: 'webhook-processor' });

webhookQueue.process('process', async (job) => {
  const { provider, event, payload } = job.data;
  log.info('Processing webhook', { jobId: job.id, provider, event });

  switch (provider) {
    case 'telegram':
      // Delegate to Telegram integration handler
      break;
    default:
      log.warn('Unknown webhook provider', { provider });
  }
});

webhookQueue.on('failed', (job, err) => {
  log.error('Webhook job failed', { jobId: job.id, error: err.message });
});

module.exports = {};

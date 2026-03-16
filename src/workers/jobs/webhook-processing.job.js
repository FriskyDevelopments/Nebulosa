/**
 * Webhook processing job.
 */
'use strict';

const { webhookQueue } = require('../queues');
const { withContext } = require('../../core/logger');

const log = withContext({ module: 'webhook-job' });

async function enqueueWebhook({ provider, event, payload }) {
  const job = await webhookQueue.add('process', { provider, event, payload });
  log.info('Webhook job enqueued', { jobId: job.id, provider, event });
  return job;
}

module.exports = { enqueueWebhook };

/**
 * Analytics aggregation job.
 */
'use strict';

const { analyticsQueue } = require('../queues');
const { withContext } = require('../../core/logger');

const log = withContext({ module: 'analytics-job' });

async function enqueueAggregation(data) {
  const job = await analyticsQueue.add('aggregate', data);
  log.info('Analytics aggregation job enqueued', { jobId: job.id });
  return job;
}

module.exports = { enqueueAggregation };

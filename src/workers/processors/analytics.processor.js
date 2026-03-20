/**
 * Analytics processor – handles aggregation jobs.
 */
'use strict';

const { analyticsQueue } = require('../queues');
const { AnalyticsService } = require('../../services/analytics-service');
const { withContext } = require('../../core/logger');

const log = withContext({ module: 'analytics-processor' });
const analyticsService = new AnalyticsService();

analyticsQueue.process('aggregate', async (job) => {
  const { event, from, to } = job.data;
  log.info('Aggregating analytics', { jobId: job.id, event });

  const count = await analyticsService.aggregate({ event, from, to });
  log.info('Aggregation complete', { event, count });
  return { event, count };
});

analyticsQueue.on('failed', (job, err) => {
  log.error('Analytics job failed', { jobId: job.id, error: err.message });
});

module.exports = {};

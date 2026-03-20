/**
 * Worker entry point.
 * Registers all processors and starts listening to queues.
 */
'use strict';

const { logger } = require('../core/logger');

// Register processors by requiring them (they self-register via Bull)
require('./processors/media.processor');
require('./processors/analytics.processor');
require('./processors/webhook.processor');

logger.info('Stix Magic workers started');

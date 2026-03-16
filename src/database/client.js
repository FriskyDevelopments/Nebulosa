/**
 * Prisma client singleton – shared across the entire application.
 */
'use strict';

const { PrismaClient } = require('@prisma/client');
const { logger } = require('../../core/logger');

let prisma;

function getPrismaClient() {
  if (!prisma) {
    prisma = new PrismaClient({
      log: [
        { emit: 'event', level: 'query' },
        { emit: 'event', level: 'error' },
        { emit: 'event', level: 'warn' },
      ],
    });

    if (process.env.NODE_ENV === 'development') {
      prisma.$on('query', (e) => {
        logger.debug('Prisma query', { query: e.query, duration: e.duration });
      });
    }

    prisma.$on('error', (e) => {
      logger.error('Prisma error', { message: e.message });
    });
  }

  return prisma;
}

module.exports = { getPrismaClient };

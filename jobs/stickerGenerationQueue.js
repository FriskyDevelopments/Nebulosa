/**
 * jobs/stickerGenerationQueue.js
 *
 * Optional BullMQ job queue for sticker generation.
 * Requires a running Redis instance (set REDIS_URL in .env).
 * Queue support degrades gracefully when Redis is unavailable.
 *
 * Usage:
 *   const { addStickerJob } = require('./jobs/stickerGenerationQueue');
 *   await addStickerJob({ telegramId: '123', stickerData: { ... } });
 */

try { require('dotenv').config(); } catch { /* dotenv is optional */ }

let Queue, Worker, isAvailable;

try {
    ({ Queue, Worker } = require('bullmq'));
    isAvailable = true;
} catch {
    isAvailable = false;
}

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const QUEUE_NAME = 'stickerGenerationQueue';

// Parse REDIS_URL into ioredis connection options
function parseRedisUrl(url) {
    try {
        const parsed = new URL(url);
        return {
            host: parsed.hostname || 'localhost',
            port: parseInt(parsed.port) || 6379,
            password: parsed.password || undefined,
        };
    } catch {
        return { host: 'localhost', port: 6379 };
    }
}

let stickerQueue = null;

function getQueue() {
    if (!isAvailable) {
        console.warn('⚠️  BullMQ not available. Queue support is disabled.');
        return null;
    }
    if (!stickerQueue) {
        const connection = parseRedisUrl(REDIS_URL);
        stickerQueue = new Queue(QUEUE_NAME, { connection });
        console.log(`🎯 ${QUEUE_NAME} initialized (Redis: ${REDIS_URL})`);
    }
    return stickerQueue;
}

/**
 * Add a sticker generation job to the queue.
 *
 * @param {{ telegramId: string, stickerData: object }} jobData
 * @returns {Promise<object|null>} The queued job, or null if queue is unavailable.
 */
async function addStickerJob(jobData) {
    const queue = getQueue();
    if (!queue) return null;
    const job = await queue.add('generate', jobData);
    console.log(`📥 Sticker job added: ${job.id}`);
    return job;
}

/**
 * Start the worker that processes sticker generation jobs.
 *
 * @param {function(object): Promise<void>} processor - Job handler function.
 * @returns {Worker|null}
 */
function startStickerWorker(processor) {
    if (!isAvailable) {
        console.warn('⚠️  BullMQ not available. Worker not started.');
        return null;
    }
    const connection = parseRedisUrl(REDIS_URL);
    const worker = new Worker(QUEUE_NAME, processor, { connection });

    worker.on('completed', job => {
        console.log(`✅ Sticker job ${job.id} completed`);
    });

    worker.on('failed', (job, err) => {
        console.error(`❌ Sticker job ${job?.id} failed:`, err.message);
    });

    console.log(`🚀 ${QUEUE_NAME} worker started`);
    return worker;
}

module.exports = { addStickerJob, startStickerWorker, getQueue, isAvailable };

// Stix Magic – scheduled cleanup worker
'use strict';

const { runCleanup } = require('../services/cleanupService');
const { CLEANUP_INTERVAL_MS } = require('../config/limits');

let _timer = null;

/**
 * Start the periodic cleanup worker.
 * Safe to call multiple times – only one timer will run at a time.
 */
function start() {
    if (_timer) return;

    console.log(
        `[CleanupWorker] Starting – interval every ${CLEANUP_INTERVAL_MS / 1000}s`
    );

    _timer = setInterval(() => {
        const { expired, purged } = runCleanup();
        if (expired > 0 || purged > 0) {
            console.log(
                `[CleanupWorker] Cycle complete – expired: ${expired}, purged: ${purged}`
            );
        }
    }, CLEANUP_INTERVAL_MS);

    // Allow the process to exit even if this timer is active
    if (_timer.unref) _timer.unref();
}

/**
 * Stop the cleanup worker (useful in tests).
 */
function stop() {
    if (_timer) {
        clearInterval(_timer);
        _timer = null;
    }
}

module.exports = { start, stop };

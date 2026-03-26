// Stix Magic – plan-based creation limits
'use strict';

/**
 * Plan definitions for Stix Magic.
 *
 * creationsPerPeriod  – how many sticker creations the user may perform within
 *                       one billing period (day for free, month for paid).
 * periodDays          – length of the billing period in days.
 * maxDrafts           – maximum number of live (non-expired, non-rejected)
 *                       drafts the user may hold at any one time.
 * draftExpiryHours    – how many hours an un-actioned draft remains before it
 *                       is automatically expired.
 * trashExpiryHours    – how many hours a trashed draft is kept before being
 *                       permanently removed.
 */
const PLANS = {
    free: {
        label: 'Free',
        creationsPerPeriod: 3,
        periodDays: 1,
        maxDrafts: 10,
        draftExpiryHours: 24,
        trashExpiryHours: 48,
    },
    premium: {
        label: 'Premium',
        creationsPerPeriod: 50,
        periodDays: 30,
        maxDrafts: 100,
        draftExpiryHours: 72,
        trashExpiryHours: 168, // 7 days
    },
    pro: {
        label: 'Pro',
        creationsPerPeriod: 300,
        periodDays: 30,
        maxDrafts: Infinity,
        draftExpiryHours: 168,  // 7 days
        trashExpiryHours: 720,  // 30 days
    },
};

/**
 * Global cleanup interval – how often the cleanup worker runs (milliseconds).
 */
const CLEANUP_INTERVAL_MS = 60 * 60 * 1000; // every hour

module.exports = { PLANS, CLEANUP_INTERVAL_MS };

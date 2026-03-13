/**
 * workers/monthlyTokenRefill.js
 *
 * Background worker that grants monthly tokens to all users with active subscriptions.
 * Run this on a monthly schedule (e.g. via cron, Railway cron job, or an external scheduler).
 *
 * Usage:
 *   node workers/monthlyTokenRefill.js
 */

try { require('dotenv').config(); } catch { /* dotenv is optional */ }
const { PLAN_TOKEN_AMOUNTS } = require('../config/tokenCosts');

/**
 * @typedef {{ telegramId: string, subscriptionPlan: string }} User
 * @typedef {{ userId: string, amount: number, type: string, source: string, createdAt: string }} TokenTransaction
 */

/**
 * Find users with paid (non-free) active subscriptions.
 * Useful for operations that only apply to paying subscribers.
 *
 * @param {User[]} users
 * @returns {User[]}
 */
function getActiveSubscribers(users) {
    return users.filter(u => u.subscriptionPlan && u.subscriptionPlan !== 'free');
}

/**
 * Determine the token grant for a given plan.
 *
 * @param {string} plan
 * @returns {number}
 */
function tokensForPlan(plan) {
    return PLAN_TOKEN_AMOUNTS[plan] ?? PLAN_TOKEN_AMOUNTS.free;
}

/**
 * Execute the monthly token refill job.
 * All users receive tokens based on their plan; free-tier users receive the minimum grant.
 *
 * @param {User[]} users - All users to process.
 * @param {function(TokenTransaction): void} persistTransaction - Callback to persist each credit transaction.
 * @returns {TokenTransaction[]} List of credit transactions created.
 */
async function monthlyTokenRefill(users, persistTransaction) {
    const transactions = [];

    // Grant tokens to every user (free tier gets 100, paid tiers get more)
    for (const user of users) {
        const plan = user.subscriptionPlan || 'free';
        const amount = tokensForPlan(plan);

        const tx = {
            userId: user.telegramId,
            amount,
            type: 'credit',
            source: 'subscription_refill',
            createdAt: new Date().toISOString(),
        };

        if (typeof persistTransaction === 'function') {
            await persistTransaction(tx);
        }

        transactions.push(tx);
        console.log(`✅ Credited ${amount} tokens to user ${user.telegramId} (plan: ${plan})`);
    }

    console.log(`🪄 Monthly token refill complete. Processed ${transactions.length} user(s).`);
    return transactions;
}

// Allow direct execution for testing / cron triggers
if (require.main === module) {
    // In a real deployment, replace this with a database query.
    const sampleUsers = [
        { telegramId: '111', subscriptionPlan: 'free' },
        { telegramId: '222', subscriptionPlan: 'premium' },
        { telegramId: '333', subscriptionPlan: 'pro' },
    ];

    monthlyTokenRefill(sampleUsers, (tx) => {
        console.log('  Transaction:', JSON.stringify(tx));
    }).then(() => process.exit(0)).catch(err => {
        console.error('❌ Worker error:', err);
        process.exit(1);
    });
}

module.exports = { monthlyTokenRefill, getActiveSubscribers, tokensForPlan };

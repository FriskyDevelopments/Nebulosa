// Token wallet configuration
// Monthly token grants per subscription plan
const PLAN_TOKEN_AMOUNTS = {
  free: 100,
  premium: 1000,
  pro: 5000,
};

// Token cost per feature action
const FEATURE_COSTS = {
  sticker_generation: parseInt(process.env.TOKEN_COST_STICKER) || 10,
  pack_export: parseInt(process.env.TOKEN_COST_EXPORT) || 25,
  magic_trigger: parseInt(process.env.TOKEN_COST_MAGIC) || 5,
};

module.exports = { PLAN_TOKEN_AMOUNTS, FEATURE_COSTS };

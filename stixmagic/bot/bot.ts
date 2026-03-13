import "dotenv/config";
import { Bot, InlineKeyboard } from "grammy";
import axios from "axios";
import { getPlanDisplayName } from "../utils/telegram.js";

if (!process.env.TELEGRAM_BOT_TOKEN) {
  throw new Error("TELEGRAM_BOT_TOKEN environment variable is required");
}

const bot = new Bot(process.env.TELEGRAM_BOT_TOKEN);

const API_BASE_URL = process.env.APP_BASE_URL ?? "http://localhost:3000";

// ─── /start ──────────────────────────────────────────────────────────────────

bot.command("start", async (ctx) => {
  const telegramId = ctx.from?.id;
  const telegramUsername = ctx.from?.username;

  if (!telegramId) {
    await ctx.reply("Could not identify your Telegram account. Please try again.");
    return;
  }

  try {
    const response = await axios.post(`${API_BASE_URL}/api/users/create-or-get`, {
      telegram_id: telegramId,
      telegram_username: telegramUsername,
    });

    const user = response.data as { plan: string; subscription_status: string };
    const planName = getPlanDisplayName(user.plan);

    await ctx.reply(
      `🪄 *Welcome to STIX MAGIC*\n\nYour account has been created.\n\nCurrent plan: *${planName}*\n\nUse /plans to upgrade.`,
      { parse_mode: "Markdown" }
    );
  } catch (error) {
    console.error("Error in /start command:", error);
    await ctx.reply("There was an error setting up your account. Please try again.");
  }
});

// ─── /plans ───────────────────────────────────────────────────────────────────

bot.command("plans", async (ctx) => {
  const telegramId = ctx.from?.id;

  if (!telegramId) {
    await ctx.reply("Could not identify your Telegram account.");
    return;
  }

  const keyboard = new InlineKeyboard()
    .url(
      "⭐ Upgrade Premium",
      await getCheckoutUrl(telegramId, "premium")
    )
    .row()
    .url(
      "🚀 Upgrade Pro",
      await getCheckoutUrl(telegramId, "pro")
    );

  await ctx.reply(
    `*STIX MAGIC PLANS*\n\n` +
      `🆓 *Free*\nBasic access\n\n` +
      `⭐ *Premium*\nAdvanced sticker magic\n\n` +
      `🚀 *Pro*\nAll features unlocked`,
    {
      parse_mode: "Markdown",
      reply_markup: keyboard,
    }
  );
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function getCheckoutUrl(telegramId: number, plan: string): Promise<string> {
  try {
    const response = await axios.post(
      `${API_BASE_URL}/api/subscription/create-checkout`,
      { telegram_id: telegramId, plan }
    );
    return (response.data as { url: string }).url;
  } catch (error) {
    console.error(`Error fetching checkout URL for plan ${plan}:`, error);
    // Fall back to the base URL so the keyboard button is still valid
    return `${API_BASE_URL}/plans`;
  }
}

// ─── Start the bot ────────────────────────────────────────────────────────────

bot.start();
console.log("🪄 Stix Magic bot is running…");

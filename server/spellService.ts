import type TelegramBot from "node-telegram-bot-api";
import type { StickerSpell } from "@shared/schema";

/**
 * Execute a sticker spell by dispatching to the appropriate action handler.
 *
 * Supported action types:
 *   send_message      — reply with the payload text
 *   send_link         — reply with a button that opens the payload URL
 *   send_sticker      — reply with the sticker whose file_id is in payload
 *   trigger_reaction  — reply with the payload text (emoji / reaction message)
 *   launch_feature    — reply with a feature-launch confirmation message
 */
export async function executeSpell(
  spell: StickerSpell,
  bot: TelegramBot,
  msg: TelegramBot.Message
): Promise<void> {
  const chatId = msg.chat.id;

  switch (spell.actionType) {
    case "send_message":
      await bot.sendMessage(chatId, spell.payload);
      break;

    case "send_link":
      await bot.sendMessage(
        chatId,
        `🌀 *${spell.spellName}* activated`,
        {
          parse_mode: "Markdown",
          reply_markup: {
            inline_keyboard: [
              [{ text: "Open link", url: spell.payload }],
            ],
          },
        }
      );
      break;

    case "send_sticker":
      await bot.sendSticker(chatId, spell.payload);
      break;

    case "trigger_reaction":
      await bot.sendMessage(chatId, spell.payload);
      break;

    case "launch_feature":
      await bot.sendMessage(
        chatId,
        `✨ *${spell.spellName}* feature launched\n\n${spell.payload}`,
        { parse_mode: "Markdown" }
      );
      break;

    default:
      console.warn(`[spellService] Unknown actionType "${spell.actionType}" for spell "${spell.spellName}"`);
  }
}

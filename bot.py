import logging
from telegram import Update
from telegram.ext import (
    Application,
    CommandHandler,
    ContextTypes,
    ConversationHandler,
    MessageHandler,
    filters,
)

logging.basicConfig(
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    level=logging.INFO,
)
logger = logging.getLogger(__name__)

# Conversation states
WAITING_PACK_NAME = 1
WAITING_STICKER = 2
WAITING_PACK_SELECTION = 3

WELCOME_MESSAGE = (
    "╔══════════════════════════════╗\n"
    "        🧪 STICKER LAB\n"
    "╚══════════════════════════════╝\n\n"
    "Welcome to the Sticker Laboratory.\n\n"
    "Choose a procedure:\n"
    "/newpack\n"
    "/addsticker\n"
    "/mypacks"
)


async def start(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Send the Sticker Lab welcome message."""
    await update.message.reply_text(WELCOME_MESSAGE)


async def newpack(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    """Ask the user for a new sticker pack name."""
    await update.message.reply_text(
        "🧪 *New Pack Protocol*\n\n"
        "Please enter a name for your new sticker pack:",
        parse_mode="Markdown",
    )
    return WAITING_PACK_NAME


async def receive_pack_name(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    """Store the new pack name provided by the user."""
    pack_name = update.message.text.strip()
    if not pack_name:
        await update.message.reply_text(
            "⚠️ Pack name cannot be empty. Please enter a valid name:"
        )
        return WAITING_PACK_NAME

    user_id = update.effective_user.id
    if "packs" not in context.bot_data:
        context.bot_data["packs"] = {}
    user_packs = context.bot_data["packs"].setdefault(user_id, [])

    if pack_name in user_packs:
        await update.message.reply_text(
            f"⚠️ A pack named *{pack_name}* already exists.\n"
            "Please choose a different name:",
            parse_mode="Markdown",
        )
        return WAITING_PACK_NAME

    user_packs.append(pack_name)
    await update.message.reply_text(
        f"✅ Pack *{pack_name}* has been created successfully!\n\n"
        "Use /addsticker to add stickers to your pack.",
        parse_mode="Markdown",
    )
    return ConversationHandler.END


async def addsticker(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    """Ask the user to select a pack and send a sticker image."""
    user_id = update.effective_user.id
    user_packs = context.bot_data.get("packs", {}).get(user_id, [])

    if not user_packs:
        await update.message.reply_text(
            "⚠️ You have no sticker packs yet.\n"
            "Use /newpack to create one first."
        )
        return ConversationHandler.END

    pack_list = "\n".join(f"• {name}" for name in user_packs)
    await update.message.reply_text(
        "🧪 *Add Sticker Protocol*\n\n"
        f"Your packs:\n{pack_list}\n\n"
        "Reply with the pack name you want to add a sticker to:",
        parse_mode="Markdown",
    )
    return WAITING_PACK_SELECTION


async def receive_pack_selection(
    update: Update, context: ContextTypes.DEFAULT_TYPE
) -> int:
    """Store the selected pack and ask for the sticker image."""
    selected = update.message.text.strip()
    user_id = update.effective_user.id
    user_packs = context.bot_data.get("packs", {}).get(user_id, [])

    if selected not in user_packs:
        await update.message.reply_text(
            f"⚠️ Pack *{selected}* not found.\n"
            "Please enter a valid pack name from your list:",
            parse_mode="Markdown",
        )
        return WAITING_PACK_SELECTION

    context.user_data["selected_pack"] = selected
    await update.message.reply_text(
        f"📎 Send an image to add to *{selected}*:",
        parse_mode="Markdown",
    )
    return WAITING_STICKER


async def receive_sticker(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    """Store the received sticker image and confirm it was added to the pack."""
    selected_pack = context.user_data.get("selected_pack", "Unknown")
    user_id = update.effective_user.id

    # Retrieve the highest-resolution version of the uploaded photo
    if update.message.photo:
        file_id = update.message.photo[-1].file_id
    else:
        file_id = update.message.document.file_id

    # Persist the sticker file_id under the user's selected pack
    stickers = context.bot_data.setdefault("stickers", {})
    user_stickers = stickers.setdefault(user_id, {})
    pack_stickers = user_stickers.setdefault(selected_pack, [])
    pack_stickers.append(file_id)

    await update.message.reply_text(
        f"✅ Sticker added to *{selected_pack}* successfully!\n"
        f"Total stickers in pack: {len(pack_stickers)}",
        parse_mode="Markdown",
    )
    return ConversationHandler.END


async def mypacks(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """List all sticker packs belonging to the user."""
    user_id = update.effective_user.id
    user_packs = context.bot_data.get("packs", {}).get(user_id, [])

    if not user_packs:
        await update.message.reply_text(
            "🧫 You have no sticker packs yet.\n"
            "Use /newpack to create your first pack!"
        )
        return

    user_stickers = context.bot_data.get("stickers", {}).get(user_id, {})
    pack_list = "\n".join(
        f"• {name} ({len(user_stickers.get(name, []))} stickers)"
        for name in user_packs
    )
    await update.message.reply_text(
        "╔══════════════════════════════╗\n"
        "        🧪 MY PACKS\n"
        "╚══════════════════════════════╝\n\n"
        f"{pack_list}"
    )


async def cancel(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    """Cancel the current conversation."""
    await update.message.reply_text(
        "🔬 Procedure cancelled. Use /start to return to the main menu."
    )
    return ConversationHandler.END


def main() -> None:
    import os

    token = os.environ.get("TELEGRAM_BOT_TOKEN")
    if not token:
        raise RuntimeError(
            "TELEGRAM_BOT_TOKEN environment variable is not set."
        )

    application = Application.builder().token(token).build()

    newpack_conv = ConversationHandler(
        entry_points=[CommandHandler("newpack", newpack)],
        states={
            WAITING_PACK_NAME: [
                MessageHandler(filters.TEXT & ~filters.COMMAND, receive_pack_name)
            ],
        },
        fallbacks=[CommandHandler("cancel", cancel)],
    )

    addsticker_conv = ConversationHandler(
        entry_points=[CommandHandler("addsticker", addsticker)],
        states={
            WAITING_PACK_SELECTION: [
                MessageHandler(filters.TEXT & ~filters.COMMAND, receive_pack_selection)
            ],
            WAITING_STICKER: [
                MessageHandler(filters.PHOTO | filters.Document.IMAGE, receive_sticker)
            ],
        },
        fallbacks=[CommandHandler("cancel", cancel)],
    )

    application.add_handler(CommandHandler("start", start))
    application.add_handler(newpack_conv)
    application.add_handler(addsticker_conv)
    application.add_handler(CommandHandler("mypacks", mypacks))

    logger.info("🧪 Sticker Lab bot is running...")
    application.run_polling()


if __name__ == "__main__":
    main()

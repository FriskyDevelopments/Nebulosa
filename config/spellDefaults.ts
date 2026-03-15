/**
 * Default sticker spell definitions — reference templates only.
 *
 * These entries document the built-in spell templates and their intended
 * action types.  They are NOT automatically registered in the database.
 *
 * To activate a spell:
 *   1. Obtain the Telegram sticker's file_id (e.g. forward to @userinfobot).
 *   2. Call POST /api/spells with the file_id plus the desired fields from
 *      one of the templates below.
 *
 * Supported action types:
 *   send_message     — bot replies with the payload text
 *   send_link        — bot replies with an inline button linking to the payload URL
 *   send_sticker     — bot sends the sticker whose file_id is the payload
 *   trigger_reaction — bot sends the payload as an emoji/reaction message
 *   launch_feature   — bot announces a feature launch with the payload description
 */
export interface SpellDefault {
  spellName: string;
  actionType:
    | "send_message"
    | "send_link"
    | "send_sticker"
    | "trigger_reaction"
    | "launch_feature";
  payload: string;
  tokenCost: number;
}

const spellDefaults: SpellDefault[] = [
  {
    spellName: "portal",
    actionType: "send_link",
    payload: "https://t.me/+invite",
    tokenCost: 5,
  },
  {
    spellName: "ritual",
    actionType: "send_message",
    payload: "🔥 Ritual started — the event has begun!",
    tokenCost: 0,
  },
  {
    spellName: "magic",
    actionType: "trigger_reaction",
    payload: "⚡ Magic activated!",
    tokenCost: 0,
  },
];

export default spellDefaults;

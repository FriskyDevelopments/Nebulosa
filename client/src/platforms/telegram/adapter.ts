import type { ExpressPacket } from "@/core/system/pipeline";

export function toTelegramMessage(packet: ExpressPacket): string {
  return `[Telegram] ${packet.reaction.text} (confidence ${(packet.reaction.confidence * 100).toFixed(0)}%)`;
}

import type { ExpressPacket } from "@/core/system/pipeline";

export function toDiscordMessage(packet: ExpressPacket): string {
  return `[Discord] ${packet.reaction.text} • mood=${packet.reaction.mood}`;
}

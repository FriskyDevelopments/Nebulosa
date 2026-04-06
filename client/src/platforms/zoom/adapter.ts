import type { ParsedCommand } from "@/core/commands/parser";
import { intakeFromCapture, intakeFromZoom } from "@/core/system/pipeline";

export function zoomEventToIntake(sessionId: string, signal: string) {
  return intakeFromZoom(sessionId, signal);
}

export function zoomCaptureToIntake(sessionId: string) {
  return intakeFromCapture(sessionId, "capture moment");
}

export function zoomCommandToApiPayload(command: ParsedCommand) {
  return {
    type: command.canonicalType,
    payload: command.payload,
    ttlSeconds: 180,
  };
}

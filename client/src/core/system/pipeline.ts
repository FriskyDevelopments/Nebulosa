export type IntakeEvent = {
  source: "zoom" | "capture";
  sessionId: string;
  signal: string;
  observedAt: string;
};

export type StixReaction = {
  id: string;
  mood: "calm" | "focus" | "celebrate";
  confidence: number;
  text: string;
};

export type ExpressPacket = {
  targets: Array<"zoom_chat" | "telegram" | "discord">;
  reaction: StixReaction;
};

export function intakeFromZoom(sessionId: string, signal: string): IntakeEvent {
  return {
    source: "zoom",
    sessionId,
    signal,
    observedAt: new Date().toISOString(),
  };
}

export function intakeFromCapture(sessionId: string, frameLabel: string): IntakeEvent {
  return {
    source: "capture",
    sessionId,
    signal: frameLabel,
    observedAt: new Date().toISOString(),
  };
}

export function transformToStix(event: IntakeEvent): StixReaction {
  const normalized = event.signal.toLowerCase();
  const isHighEnergy = /applause|win|celebrate|moment/.test(normalized);
  const isFocus = /quiet|focus|briefing|mute/.test(normalized);

  const mood: StixReaction["mood"] = isHighEnergy ? "celebrate" : isFocus ? "focus" : "calm";
  const confidence = isHighEnergy ? 0.92 : isFocus ? 0.86 : 0.74;

  return {
    id: `${event.sessionId}-${Date.now()}`,
    mood,
    confidence,
    text:
      mood === "celebrate"
        ? "STIX pulse: momentum spike detected ✦"
        : mood === "focus"
          ? "STIX pulse: focus state stabilized ◈"
          : "STIX pulse: ambient calm maintained ○",
  };
}

export function expressReaction(reaction: StixReaction): ExpressPacket {
  return {
    targets: ["zoom_chat", "telegram", "discord"],
    reaction,
  };
}

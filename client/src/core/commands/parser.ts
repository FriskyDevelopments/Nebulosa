export type ParsedCommand = {
  raw: string;
  canonicalType: "session.admit_all" | "session.mute_all" | "session.lock_room" | "capture.moment";
  payload: {
    sessionId: string;
    reason: string;
    metadata?: Record<string, string>;
  };
  description: string;
};

const COMMAND_PATTERNS: Array<{
  matcher: RegExp;
  build: (raw: string, sessionId: string) => ParsedCommand;
}> = [
  {
    matcher: /^\/zoom\s+admit\s+all$/i,
    build: (raw, sessionId) => ({
      raw,
      canonicalType: "session.admit_all",
      payload: {
        sessionId,
        reason: "Host requested admit all via Nebu command parser",
      },
      description: "Admit every waiting participant into the active Zoom room.",
    }),
  },
  {
    matcher: /^\/zoom\s+mute\s+all$/i,
    build: (raw, sessionId) => ({
      raw,
      canonicalType: "session.mute_all",
      payload: {
        sessionId,
        reason: "Host requested mute all via Nebu command parser",
      },
      description: "Mute all participants in the active session.",
    }),
  },
  {
    matcher: /^\/zoom\s+lock\s+room$/i,
    build: (raw, sessionId) => ({
      raw,
      canonicalType: "session.lock_room",
      payload: {
        sessionId,
        reason: "Host requested room lock via Nebu command parser",
      },
      description: "Lock the Zoom room to prevent new participant joins.",
    }),
  },
  {
    matcher: /^\/capture\s+moment$/i,
    build: (raw, sessionId) => ({
      raw,
      canonicalType: "capture.moment",
      payload: {
        sessionId,
        reason: "Host requested frame capture for STIX reaction generation",
      },
      description: "Capture the current moment and route it through the STIX flow.",
    }),
  },
];

export function parseNebuCommand(input: string, sessionId: string): ParsedCommand | null {
  const trimmed = input.trim();
  for (const pattern of COMMAND_PATTERNS) {
    if (pattern.matcher.test(trimmed)) {
      return pattern.build(trimmed, sessionId);
    }
  }

  return null;
}

export function getSupportedCommands(): string[] {
  return ["/zoom admit all", "/zoom mute all", "/zoom lock room", "/capture moment"];
}

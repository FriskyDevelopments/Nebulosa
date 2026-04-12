/**
 * Nebulosa live stream — wire `NEXT_PUBLIC_TELEMETRY_WS` to your gateway in production.
 * Message shape: JSON lines or JSON objects matching TelemetryEvent.
 */

export type TelemetryChannel = "ghost_protocol" | "signal" | "system";

export type TelemetryEvent = {
  id: string;
  ts: number;
  channel: TelemetryChannel;
  title: string;
  detail?: string;
  /** Optional severity for accent styling */
  severity?: "info" | "warn" | "critical";
};

const GHOST_VERBS = [
  "Phase shift",
  "Spectral handshake",
  "Lattice echo",
  "Void calibration",
  "Ion veil sync",
  "Quantum pingback",
];

const SIGNAL_VERBS = [
  "Carrier lock",
  "Mesh reconcile",
  "Entropy budget",
  "Handshake ACK",
  "Frame seal",
];

function randomId() {
  return `evt_${Math.random().toString(36).slice(2, 11)}_${Date.now().toString(36)}`;
}

export function mockTelemetryEvent(): TelemetryEvent {
  const ghost = Math.random() > 0.42;
  const verbs = ghost ? GHOST_VERBS : SIGNAL_VERBS;
  const title = `${verbs[Math.floor(Math.random() * verbs.length)]} · ${(Math.random() * 999).toFixed(1)}ms`;
  return {
    id: randomId(),
    ts: Date.now(),
    channel: ghost ? "ghost_protocol" : Math.random() > 0.55 ? "signal" : "system",
    title,
    detail: ghost
      ? "Encrypted sidereal payload verified — routing through nebula mesh."
      : "Standard telemetry shard; checksum nominal.",
    severity: Math.random() > 0.88 ? "warn" : "info",
  };
}

export function parseTelemetryPayload(raw: string): TelemetryEvent | null {
  try {
    const data = JSON.parse(raw) as Partial<TelemetryEvent>;
    if (typeof data.id === "string" && typeof data.title === "string" && typeof data.ts === "number") {
      return {
        id: data.id,
        ts: data.ts,
        channel: (data.channel as TelemetryChannel) ?? "system",
        title: data.title,
        detail: data.detail,
        severity: data.severity,
      };
    }
  } catch {
    /* ignore */
  }
  return null;
}

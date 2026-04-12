"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { mockTelemetryEvent, parseTelemetryPayload, type TelemetryEvent } from "@/lib/telemetry";

const MAX_EVENTS = 14;
const MOCK_INTERVAL_MS = 3200;

const TELEMETRY_WS_URL = process.env.NEXT_PUBLIC_TELEMETRY_WS;
const IS_MOCK = !TELEMETRY_WS_URL;

function trim<T>(arr: T[], max: number): T[] {
  return arr.length <= max ? arr : arr.slice(0, max);
}

export function useTelemetryEvents() {
  const [events, setEvents] = useState<TelemetryEvent[]>([]);
  const [connected, setConnected] = useState(() => (IS_MOCK ? true : false));
  const wsRef = useRef<WebSocket | null>(null);
  const mockTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const pushEvent = useCallback((ev: TelemetryEvent) => {
    setEvents((prev) => trim([ev, ...prev], MAX_EVENTS));
  }, []);

  useEffect(() => {
    if (!IS_MOCK) return;

    const boot = window.setTimeout(() => {
      pushEvent(mockTelemetryEvent());
    }, 0);

    mockTimerRef.current = setInterval(() => {
      pushEvent(mockTelemetryEvent());
    }, MOCK_INTERVAL_MS);

    return () => {
      window.clearTimeout(boot);
      if (mockTimerRef.current) clearInterval(mockTimerRef.current);
    };
  }, [pushEvent]);

  useEffect(() => {
    if (IS_MOCK) return;

    let ws: WebSocket;
    try {
      ws = new WebSocket(TELEMETRY_WS_URL!);
    } catch {
      queueMicrotask(() => setConnected(false));
      return;
    }
    wsRef.current = ws;

    ws.onopen = () => setConnected(true);
    ws.onclose = () => setConnected(false);
    ws.onerror = () => setConnected(false);
    ws.onmessage = (ev) => {
      const parsed = parseTelemetryPayload(String(ev.data));
      if (parsed) pushEvent(parsed);
    };

    return () => {
      ws.close();
      wsRef.current = null;
    };
  }, [pushEvent]);

  return {
    events,
    connected,
    mode: IS_MOCK ? ("mock" as const) : ("live" as const),
  };
}

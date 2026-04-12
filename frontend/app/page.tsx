"use client";

import { useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useTelemetryEvents } from "@/hooks/useTelemetryEvents";
import type { TelemetryEvent } from "@/lib/telemetry";
import styles from "./page.module.css";

const DEEP_PURPLE = "#1a0b2e";

function formatTs(ts: number) {
  return new Intl.DateTimeFormat(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    fractionalSecondDigits: 3,
  }).format(ts);
}

function GhostTelemetryRow({ event }: { event: TelemetryEvent }) {
  return (
    <motion.article
      layout
      className={styles.ghostRow}
      initial={{ y: -36, opacity: 0, filter: "blur(12px) brightness(1.4)" }}
      animate={{
        y: 0,
        opacity: 1,
        filter: "blur(0px) brightness(1.05)",
        boxShadow: [
          "0 0 0 1px rgba(0,0,0,0.35) inset, 0 0 28px rgba(46,243,255,0.35), 0 12px 28px rgba(0,0,0,0.35)",
          "0 0 0 1px rgba(0,0,0,0.35) inset, 0 0 48px rgba(46,243,255,0.55), 0 12px 32px rgba(0,0,0,0.4)",
          "0 0 0 1px rgba(0,0,0,0.35) inset, 0 0 28px rgba(46,243,255,0.35), 0 12px 28px rgba(0,0,0,0.35)",
        ],
      }}
      exit={{
        opacity: 0,
        filter: "blur(10px) brightness(0.65)",
        backgroundColor: DEEP_PURPLE,
        transition: { duration: 1.35, ease: [0.4, 0, 0.2, 1] },
      }}
      transition={{
        y: { type: "spring", stiffness: 380, damping: 28, mass: 0.85 },
        opacity: { duration: 0.45 },
        filter: { duration: 0.55 },
        boxShadow: { duration: 2.8, repeat: Infinity, ease: "easeInOut" },
      }}
    >
      <div className={styles.shatterLayer} aria-hidden />
      <div className={styles.rowBody}>
        <h3 className={styles.rowTitle}>{event.title}</h3>
        {event.detail ? <p className={styles.rowDetail}>{event.detail}</p> : null}
        <div className={styles.rowMeta}>
          {formatTs(event.ts)}
          {event.severity === "warn" ? " · ⚠ spectral anomaly" : ""}
        </div>
      </div>
    </motion.article>
  );
}

function StreamTelemetryRow({ event }: { event: TelemetryEvent }) {
  return (
    <motion.article
      layout
      className={styles.signalRow}
      initial={{ y: -14, opacity: 0, filter: "blur(6px)" }}
      animate={{ y: 0, opacity: 1, filter: "blur(0px)" }}
      exit={{
        opacity: 0,
        filter: "blur(10px)",
        backgroundColor: DEEP_PURPLE,
        transition: { duration: 1.2, ease: [0.4, 0, 0.2, 1] },
      }}
      transition={{
        type: "spring",
        stiffness: 320,
        damping: 32,
      }}
    >
      <div className={styles.rowBody}>
        <h3 className={styles.rowTitle}>{event.title}</h3>
        {event.detail ? <p className={styles.rowDetail}>{event.detail}</p> : null}
        <div className={styles.rowMeta}>
          {event.channel.toUpperCase()} · {formatTs(event.ts)}
        </div>
      </div>
    </motion.article>
  );
}

export default function NebulosaDashboardPage() {
  const { events, connected, mode } = useTelemetryEvents();

  const ghostList = useMemo(
    () => events.filter((e) => e.channel === "ghost_protocol"),
    [events],
  );
  const streamList = useMemo(
    () => events.filter((e) => e.channel !== "ghost_protocol"),
    [events],
  );

  return (
    <div className={styles.shell}>
      <div className={styles.inner}>
        <header className={styles.header}>
          <div className={styles.titleBlock}>
            <h1>Nebulosa · Telemetry Core</h1>
            <p>
              Live WebSocket shards rendered through AnimatePresence — older frames decohere into deep void purple{" "}
              <span className={styles.hexInline}>{DEEP_PURPLE}</span>.
            </p>
          </div>
          <div
            className={styles.statusPill}
            title={connected ? "Stream active" : "Stream unavailable"}
          >
            <span
              className={`${styles.statusDot} ${connected ? "" : styles.statusDotOffline}`}
            />
            {connected ? "LIVE" : "OFFLINE"} · {mode === "mock" ? "SIMULATED" : "WS"}
          </div>
        </header>

        <div className={styles.grid}>
          <section className={`${styles.panel} ${styles.panelGhost}`}>
            <div className={styles.panelHeader}>
              <h2>Ghost Protocol</h2>
              <span>{ghostList.length} echoes</span>
            </div>
            <div className={styles.listViewport}>
              <div className={styles.listStack}>
                <AnimatePresence mode="popLayout" initial={false}>
                  {ghostList.map((event) => (
                    <GhostTelemetryRow key={event.id} event={event} />
                  ))}
                </AnimatePresence>
                {ghostList.length === 0 ? (
                  <p className={styles.rowDetail} style={{ padding: "1rem 0.25rem", opacity: 0.5 }}>
                    Awaiting ghost-channel frames…
                  </p>
                ) : null}
              </div>
            </div>
          </section>

          <section className={`${styles.panel} ${styles.panelSignal}`}>
            <div className={styles.panelHeader}>
              <h2>Signal + System</h2>
              <span>{streamList.length} frames</span>
            </div>
            <div className={styles.listViewport}>
              <div className={styles.listStack}>
                <AnimatePresence mode="popLayout" initial={false}>
                  {streamList.map((event) => (
                    <StreamTelemetryRow key={event.id} event={event} />
                  ))}
                </AnimatePresence>
                {streamList.length === 0 ? (
                  <p className={styles.rowDetail} style={{ padding: "1rem 0.25rem", opacity: 0.5 }}>
                    No secondary-channel telemetry yet.
                  </p>
                ) : null}
              </div>
            </div>
          </section>
        </div>

        <p className={styles.hint}>
          Set <code>NEXT_PUBLIC_TELEMETRY_WS=wss://your-gateway</code> for production ingress. JSON fields:{" "}
          <code>id</code>, <code>ts</code>, <code>title</code>, <code>channel</code> (
          <code>ghost_protocol</code> | <code>signal</code> | <code>system</code>).
        </p>
      </div>
    </div>
  );
}

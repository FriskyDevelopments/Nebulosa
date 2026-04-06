# Nebu Concept Architecture Map

## Product Layers

- `client/src/core`
  - `commands/parser.ts`: command-first parsing and canonical command mapping.
  - `system/pipeline.ts`: intake → transform → express flow for STIX reactions.
- `client/src/platforms`
  - `zoom/adapter.ts`: converts Zoom session actions/events into core inputs + command payloads.
  - `telegram/adapter.ts`: formats express output for Telegram.
  - `discord/adapter.ts`: formats express output for Discord.
- `client/src/ui/nebu`
  - `NebuShell`: 3-column command/host/reaction shell.
  - `CommandBar`: parser-first command entry + fallback quick actions.
  - `SessionGrid`: host/session metrics.
  - `NodeGraph`: central node view for intake/transform/express Xi states.
- `client/src/ui/stix`
  - `ReactionPanel`: STIX reaction output feed.
  - `XiGlyph`: shared Xi icon + state indicator.

## Central System Flow

1. **Intake**
   - Zoom event input (`zoomEventToIntake`) or capture input (`zoomCaptureToIntake`).
2. **Transform**
   - STIX reaction generation (`transformToStix`) from intake signals.
3. **Express**
   - Multi-platform packet (`expressReaction`) sent through thin platform adapters.

## Xi State Usage

- `base`: idle/standby
- `active`: command processing stage in progress
- `signal`: completed/high-signal stage

Used in command execution lifecycle, central node graph, and feedback glyphs.

## Follow-up Tasks

1. Wire adapters to real Zoom/Telegram/Discord transport APIs.
2. Persist STIX reaction history server-side for audit playback.
3. Add command parser test matrix for malformed and permission-sensitive inputs.
4. Add websocket push for queue/alerts instead of polling.
5. Replace temporary heuristic transform rules with model-backed STIX scoring.

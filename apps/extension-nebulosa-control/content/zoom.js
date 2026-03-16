/**
 * Zoom Content Script — apps/extension-nebulosa-control/content/zoom.js
 *
 * Entry point injected into every https://*.zoom.us/* page.
 *
 * Responsibilities:
 *  1. Detect whether this is an active Zoom meeting page
 *  2. Initialise the ZoomAdapter (which starts DOM observation and
 *     wires events to the event bus)
 *  3. Enable configured modules based on saved settings
 *  4. Relay status to the background service worker via chrome.runtime.sendMessage
 *  5. Listen for commands from background.js (e.g. toggle a module)
 *
 * All Zoom-specific DOM interaction lives in integrations/zoom/.
 * All business logic lives in modules/.
 * This file only bootstraps and coordinates.
 */

/* global window, document, chrome */

// ── Load dependencies (injected via manifest web_accessible_resources) ──────
// In the extension context these are loaded as separate content scripts
// declared in manifest.json before this file. The globals are set on window.

const bus = window.NebulosaBus;
const ZoomAdapter = window.ZoomAdapter;
const ZoomEvents = window.ZoomEvents;

const MultipinModule = window.NebulosaMultipin;
const CameraMonitorModule = window.NebulosaCameraMonitor;
const ModerationModule = window.NebulosaModeration;
const WaitingRoomModule = window.NebulosaWaitingRoom;

// ── Debug flag ───────────────────────────────────────────────────────────────
// Set window.__NEBULOSA_DEBUG = true in the console to enable verbose logging.
const DEBUG = window.__NEBULOSA_DEBUG === true;
function dbg(...args) {
  if (DEBUG) console.log('[Nebulosa:ContentScript]', ...args); // eslint-disable-line no-console
}

// ── Settings defaults ─────────────────────────────────────────────────────────
const DEFAULT_SETTINGS = {
  multipinEnabled: true,
  cameraMonitorEnabled: false,
  moderationEnabled: false,
  waitingRoomEnabled: false,
};

// ── Bootstrap ─────────────────────────────────────────────────────────────────

let _initialised = false;

async function init() {
  if (_initialised) return;

  // Wait until the meeting UI is present before starting
  if (!ZoomEvents.isMeetingPage()) {
    dbg('Not a meeting page — waiting for navigation…');
    // Poll until meeting UI appears (Zoom is a SPA)
    const checkId = window.setInterval(() => {
      if (ZoomEvents.isMeetingPage()) {
        window.clearInterval(checkId);
        _bootstrap();
      }
    }, 2000);
    return;
  }

  _bootstrap();
}

async function _bootstrap() {
  if (_initialised) return;
  _initialised = true;

  dbg('Meeting page detected — bootstrapping');

  // Load persisted settings
  const settings = await _loadSettings();

  // Start the Zoom integration layer
  ZoomAdapter.init();

  // Enable modules per saved settings
  if (settings.multipinEnabled) MultipinModule.enable();
  if (settings.cameraMonitorEnabled) CameraMonitorModule.enable();
  if (settings.moderationEnabled) ModerationModule.enable();
  if (settings.waitingRoomEnabled) WaitingRoomModule.enable();

  // Notify background / popup that a meeting was detected
  _sendStatus({ meetingDetected: true, settings });

  // Forward key bus events to background for popup display
  bus.on('participant_joined', (p) => _sendStatus({ event: 'participant_joined', payload: p }));
  bus.on('hand_raised', (p) => _sendStatus({ event: 'hand_raised', payload: p }));
  bus.on('moderation_triggered', (p) =>
    _sendStatus({ event: 'moderation_triggered', payload: p })
  );

  dbg('Bootstrap complete. Active modules:', {
    multipin: MultipinModule.isEnabled(),
    cameraMonitor: CameraMonitorModule.isEnabled(),
    moderation: ModerationModule.isEnabled(),
    waitingRoom: WaitingRoomModule.isEnabled(),
  });
}

// ── Message handling (commands from background/popup) ────────────────────────

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  dbg('Message received:', message);

  switch (message.type) {
    case 'GET_STATUS':
      sendResponse(_buildStatus());
      break;

    case 'TOGGLE_MODULE': {
      const { module: mod, enabled } = message;
      _handleToggle(mod, enabled);
      sendResponse({ ok: true });
      break;
    }

    default:
      sendResponse({ ok: false, error: 'Unknown message type' });
  }

  // Return true to keep the message channel open for async responses
  return true;
});

function _handleToggle(mod, enabled) {
  const map = {
    multipin: MultipinModule,
    cameraMonitor: CameraMonitorModule,
    moderation: ModerationModule,
    waitingRoom: WaitingRoomModule,
  };
  const m = map[mod];
  if (!m) return;
  enabled ? m.enable() : m.disable();
  _saveSettings();
  dbg('Module toggled:', mod, enabled);
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function _buildStatus() {
  return {
    meetingDetected: _initialised,
    multipin: MultipinModule.isEnabled(),
    cameraMonitor: CameraMonitorModule.isEnabled(),
    moderation: ModerationModule.isEnabled(),
    waitingRoom: WaitingRoomModule.isEnabled(),
    pinned: MultipinModule.getPinned(),
  };
}

function _sendStatus(extra = {}) {
  try {
    chrome.runtime.sendMessage({ type: 'CONTENT_STATUS', ..._buildStatus(), ...extra });
  } catch (_) {
    // Extension context may have been invalidated — safe to ignore
  }
}

function _loadSettings() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(DEFAULT_SETTINGS, (result) => {
      resolve(result);
    });
  });
}

function _saveSettings() {
  chrome.storage.sync.set({
    multipinEnabled: MultipinModule.isEnabled(),
    cameraMonitorEnabled: CameraMonitorModule.isEnabled(),
    moderationEnabled: ModerationModule.isEnabled(),
    waitingRoomEnabled: WaitingRoomModule.isEnabled(),
  });
}

// Start on load
init();

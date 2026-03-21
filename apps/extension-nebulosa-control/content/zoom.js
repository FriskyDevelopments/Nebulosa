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

// ── Load dependencies (injected as content_scripts in manifest.json) ────────
// Scripts are loaded in the order declared in the manifest content_scripts list.
// Each sets a window.* global that subsequent scripts (and this file) consume.

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
/** @type {{ type: string, payload: object, ts: number }|null} */
let _lastEvent = null;

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
  _sendStatus({ meetingDetected: true });

  // Forward key bus events to background — also record last event for popup diagnostics
  const _trackEvent = (type) => (payload) => {
    _lastEvent = { type, payload, ts: Date.now() };
    _sendStatus();
  };
  bus.on('participant_joined', _trackEvent('participant_joined'));
  bus.on('hand_raised', _trackEvent('hand_raised'));
  bus.on('camera_on', _trackEvent('camera_on'));
  bus.on('camera_off', _trackEvent('camera_off'));
  bus.on('moderation_triggered', _trackEvent('moderation_triggered'));

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
      return false;

    case 'TOGGLE_MODULE': {
      const { module: mod, enabled } = message;
      _handleToggle(mod, enabled);
      sendResponse({ ok: true });
      return false;
    }

    default:
      sendResponse({ ok: false, error: 'Unknown message type' });
      return false;
  }
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
    observersActive: _initialised,
    multipin: MultipinModule.isEnabled(),
    cameraMonitor: CameraMonitorModule.isEnabled(),
    moderation: ModerationModule.isEnabled(),
    waitingRoom: WaitingRoomModule.isEnabled(),
    pinned: MultipinModule.getPinned(),
    lastEvent: _lastEvent,
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

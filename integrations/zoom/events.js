/**
 * Zoom Event Detection — integrations/zoom/events.js
 *
 * Watches the Zoom Web Client DOM using MutationObserver and
 * periodic polling as a fallback. Detects participant events,
 * hand raises, camera state changes, and chat messages.
 *
 * Detected events are forwarded to the Zoom Adapter (adapter.js)
 * which translates them into internal Nebulosa event-bus events.
 *
 * Preserved behaviour from zoomBrowserBot.js:
 *  - Hand raise detection via DOM presence of hand-raise indicator
 *  - Camera off detection via avatar/camera-off class presence
 *  - Participant join/leave via participant list mutations
 *
 * NOTE: All selectors are imported from selectors.js. When Zoom updates
 * its UI, only selectors.js needs to change.
 */

/* global window, document, MutationObserver */

const ZoomSelectors =
  typeof require !== 'undefined'
    ? require('./selectors')
    : window.ZoomSelectors;

const DEBUG =
  typeof window !== 'undefined' && window.__NEBULOSA_DEBUG === true;

function dbg(...args) {
  if (DEBUG) console.log('[Nebulosa:ZoomEvents]', ...args); // eslint-disable-line no-console
}

// ── Internal state ─────────────────────────────────────────────────────────

/** @type {Set<string>} Participant names currently known to be in the meeting. */
const _participants = new Set();

/** @type {Set<string>} Participants with hand currently raised. */
const _handsRaised = new Set();

/** @type {Set<string>} Participants whose camera is currently off. */
const _cameraOff = new Set();

/**
 * Tracks all participant names whose camera state has been observed at least once.
 * Allows the initial scan to emit camera_on for participants already visible
 * with camera on at bootstrap, so modules don't miss initial state.
 */
const _cameraSeen = new Set();

/** @type {MutationObserver|null} */
let _observer = null;

/** @type {number|null} Polling interval id. */
let _pollInterval = null;

/** @type {number|null} Debounce timer for MutationObserver. */
let _debounceTimer = null;

/** Callback registry — set by adapter.js */
const _callbacks = {
  onParticipantJoined: null,
  onParticipantLeft: null,
  onHandRaised: null,
  onHandLowered: null,
  onCameraOn: null,
  onCameraOff: null,
  onChatMessage: null,
  onMeetingDetected: null,
  onMeetingEnded: null,
};

// ── Public API ──────────────────────────────────────────────────────────────

/**
 * Register event callbacks. Called once by the adapter.
 * @param {Partial<typeof _callbacks>} callbacks
 */
function register(callbacks) {
  Object.assign(_callbacks, callbacks);
}

/**
 * Start observing the Zoom Web Client DOM.
 * Safe to call multiple times (idempotent).
 */
function start() {
  if (_observer) return; // already running

  dbg('Starting DOM observation…');

  // Initial scan
  _scanParticipants();
  _scanHandRaises();
  _scanCameras();
  _scanChat();

  // MutationObserver on the entire document body — Zoom's React SPA
  // re-renders frequently. The callback is debounced (250 ms) to avoid
  // running full querySelectorAll sweeps on every micro-mutation.
  _observer = new MutationObserver(() => {
    if (_debounceTimer !== null) window.clearTimeout(_debounceTimer);
    _debounceTimer = window.setTimeout(() => {
      _debounceTimer = null;
      _scanParticipants();
      _scanHandRaises();
      _scanCameras();
    }, 250);
  });

  _observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['class', 'aria-label'],
  });

  // Fallback polling every 3 seconds for chat and slower state changes
  _pollInterval = window.setInterval(() => {
    _scanParticipants();
    _scanHandRaises();
    _scanCameras();
    _scanChat();
  }, 3000);

  dbg('DOM observation active');
}

/**
 * Stop all observation and clear internal state.
 */
function stop() {
  if (_debounceTimer !== null) {
    window.clearTimeout(_debounceTimer);
    _debounceTimer = null;
  }
  if (_observer) {
    _observer.disconnect();
    _observer = null;
  }
  if (_pollInterval !== null) {
    window.clearInterval(_pollInterval);
    _pollInterval = null;
  }
  _participants.clear();
  _handsRaised.clear();
  _cameraOff.clear();
  _cameraSeen.clear();
  dbg('DOM observation stopped');
}

/**
 * Returns true if the current page looks like an active Zoom meeting.
 */
function isMeetingPage() {
  return (
    /zoom\.us\/(wc|j)\//i.test(window.location.href) ||
    !!document.querySelector(ZoomSelectors.MEETING_ROOT)
  );
}

// ── Internal helpers ────────────────────────────────────────────────────────

/**
 * Extract the visible display name from a participant element.
 * @param {Element} el
 * @returns {string}
 */
function _extractName(el) {
  const nameEl =
    el.querySelector(ZoomSelectors.PARTICIPANT_ROW_NAME) ||
    el.querySelector(ZoomSelectors.VIDEO_TILE_NAME);
  return nameEl ? nameEl.textContent.trim() : el.getAttribute('aria-label') || '';
}

/** Scan participants panel / video tiles for join/leave changes. */
function _scanParticipants() {
  const rows = document.querySelectorAll(ZoomSelectors.PARTICIPANT_ROW);
  const current = new Set();

  if (!rows.length && document.readyState === 'complete') {
    dbg('_scanParticipants: no rows found — selector may need updating:', ZoomSelectors.PARTICIPANT_ROW);
  }

  rows.forEach((row) => {
    const name = _extractName(row);
    if (!name) return;
    current.add(name);
    if (!_participants.has(name)) {
      _participants.add(name);
      dbg('Participant joined:', name);
      _callbacks.onParticipantJoined && _callbacks.onParticipantJoined({ name });
    }
  });

  // Detect leaves
  _participants.forEach((name) => {
    if (!current.has(name)) {
      _participants.delete(name);
      _handsRaised.delete(name);
      _cameraOff.delete(name);
      _cameraSeen.delete(name); // clear camera state history so participant is treated as new if they rejoin
      dbg('Participant left:', name);
      _callbacks.onParticipantLeft && _callbacks.onParticipantLeft({ name });
    }
  });
}

/** Scan for hand raise state changes. */
function _scanHandRaises() {
  const rows = document.querySelectorAll(ZoomSelectors.PARTICIPANT_ROW);
  const currentRaised = new Set();

  rows.forEach((row) => {
    const name = _extractName(row);
    if (!name) return;
    const hasHandIndicator = !!row.querySelector(ZoomSelectors.HAND_RAISED_INDICATOR);
    if (hasHandIndicator) currentRaised.add(name);
  });

  // New raises
  currentRaised.forEach((name) => {
    if (!_handsRaised.has(name)) {
      _handsRaised.add(name);
      dbg('Hand raised:', name);
      _callbacks.onHandRaised && _callbacks.onHandRaised({ name });
    }
  });

  // Lowered hands
  _handsRaised.forEach((name) => {
    if (!currentRaised.has(name)) {
      _handsRaised.delete(name);
      dbg('Hand lowered:', name);
      _callbacks.onHandLowered && _callbacks.onHandLowered({ name });
    }
  });
}

/** Scan for camera on/off state changes. */
function _scanCameras() {
  const tiles = document.querySelectorAll(ZoomSelectors.VIDEO_TILE);

  if (!tiles.length && document.readyState === 'complete') {
    dbg('_scanCameras: no video tiles found — selector may need updating:', ZoomSelectors.VIDEO_TILE);
  }

  tiles.forEach((tile) => {
    const name = _extractName(tile);
    if (!name) return;
    const isCamOff = !!tile.querySelector(ZoomSelectors.CAMERA_OFF_INDICATOR);

    if (!_cameraSeen.has(name)) {
      // First time we observe this participant — emit their initial camera state
      // so modules that rely on camera_on events are primed correctly.
      _cameraSeen.add(name);
      if (isCamOff) {
        _cameraOff.add(name);
        dbg('Camera off (initial):', name);
        _callbacks.onCameraOff && _callbacks.onCameraOff({ name });
      } else {
        dbg('Camera on (initial):', name);
        _callbacks.onCameraOn && _callbacks.onCameraOn({ name });
      }
      return;
    }

    // Subsequent scans — emit only on state transitions
    if (isCamOff && !_cameraOff.has(name)) {
      _cameraOff.add(name);
      dbg('Camera off:', name);
      _callbacks.onCameraOff && _callbacks.onCameraOff({ name });
    } else if (!isCamOff && _cameraOff.has(name)) {
      _cameraOff.delete(name);
      dbg('Camera on:', name);
      _callbacks.onCameraOn && _callbacks.onCameraOn({ name });
    }
  });
}

/** @type {Element|null} Last known chat container reference. */
let _lastChatContainer = null;
/** @type {number} Number of messages known at last scan. */
let _lastMessageCount = 0;

/** Scan chat panel for new messages. */
function _scanChat() {
  const panel = document.querySelector(ZoomSelectors.CHAT_PANEL);
  if (!panel) return;

  const messages = panel.querySelectorAll(ZoomSelectors.CHAT_MESSAGE);
  if (messages.length === _lastMessageCount && panel === _lastChatContainer) return;

  const newMessages = Array.from(messages).slice(_lastMessageCount);
  _lastChatContainer = panel;
  _lastMessageCount = messages.length;

  newMessages.forEach((msgEl) => {
    const senderEl = msgEl.querySelector(ZoomSelectors.CHAT_SENDER);
    const sender = senderEl ? senderEl.textContent.trim() : 'Unknown';
    const text = msgEl.textContent
      .replace(sender, '')
      .trim();
    dbg('Chat message from', sender, ':', text);
    _callbacks.onChatMessage && _callbacks.onChatMessage({ sender, text });
  });
}

// CommonJS + browser-global dual export
const ZoomEvents = { register, start, stop, isMeetingPage };

if (typeof module !== 'undefined' && module.exports) {
  module.exports = ZoomEvents;
} else if (typeof window !== 'undefined') {
  window.ZoomEvents = ZoomEvents;
}

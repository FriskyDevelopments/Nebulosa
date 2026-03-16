/**
 * Zoom Adapter — integrations/zoom/adapter.js
 *
 * Translates low-level Zoom DOM events (from events.js) into
 * Nebulosa internal event-bus events (packages/event-bus).
 *
 * Also provides helpers to perform Zoom host actions from within
 * the content script context (pin, unpin, admit from waiting room).
 *
 * Preserved behaviour from zoomBrowserBot.js:
 *  - multipinUser: right-click video tile → find "Pin" / "Multi-pin" in context menu
 *  - unpinUser:    right-click pinned tile → find "Unpin" in context menu
 *
 * Adaptation notes:
 *  - Puppeteer's page.click() is replaced with native DOM click() / dispatchEvent()
 *  - page.waitForSelector() is replaced with a polling helper (_waitFor)
 *  - The selector lists are sourced from selectors.js for maintainability
 */

/* global window, document, MouseEvent */

const ZoomSelectors =
  typeof require !== 'undefined' ? require('./selectors') : window.ZoomSelectors;

const ZoomEvents =
  typeof require !== 'undefined' ? require('./events') : window.ZoomEvents;

const bus =
  typeof require !== 'undefined'
    ? require('../../packages/event-bus')
    : window.NebulosaBus;

const DEBUG =
  typeof window !== 'undefined' && window.__NEBULOSA_DEBUG === true;

function dbg(...args) {
  if (DEBUG) console.log('[Nebulosa:ZoomAdapter]', ...args); // eslint-disable-line no-console
}

// ── Helper: wait for a selector to appear (replaces puppeteer waitForSelector) ──

/**
 * Poll for a CSS selector to appear in the DOM.
 * @param {string} selector
 * @param {number} [timeoutMs=3000]
 * @returns {Promise<Element>}
 */
function _waitFor(selector, timeoutMs = 3000) {
  return new Promise((resolve, reject) => {
    const found = document.querySelector(selector);
    if (found) return resolve(found);
    const start = Date.now();
    const id = window.setInterval(() => {
      const el = document.querySelector(selector);
      if (el) {
        window.clearInterval(id);
        resolve(el);
      } else if (Date.now() - start > timeoutMs) {
        window.clearInterval(id);
        reject(new Error(`Timeout waiting for: ${selector}`));
      }
    }, 100);
  });
}

/**
 * Simulate a right-click on an element.
 * @param {Element} el
 */
function _rightClick(el) {
  el.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true }));
}

/**
 * Find the first menu item whose text matches a pattern.
 * @param {string} textPattern - case-insensitive substring
 * @returns {Element|null}
 */
function _findMenuItem(textPattern) {
  const items = document.querySelectorAll(ZoomSelectors.CONTEXT_MENU_ITEM);
  const lower = textPattern.toLowerCase();
  for (const item of items) {
    if (item.textContent.toLowerCase().includes(lower)) return item;
  }
  return null;
}

// ── Host Actions ────────────────────────────────────────────────────────────

/**
 * Pin a participant's video using the Zoom context menu.
 * Preserved from zoomBrowserBot.multipinUser().
 *
 * @param {string} name - Display name of the participant.
 * @returns {Promise<'MULTIPIN_GRANTED'|'USER_NOT_FOUND'|'CONTEXT_MENU_NOT_FOUND'|'PIN_OPTION_NOT_FOUND'|'ALREADY_PINNED'|'ERROR'>}
 */
async function pinParticipant(name) {
  try {
    dbg('pinParticipant:', name);

    // Find the video tile for this participant
    const tiles = document.querySelectorAll(ZoomSelectors.VIDEO_TILE);
    let targetTile = null;
    for (const tile of tiles) {
      const nameEl =
        tile.querySelector(ZoomSelectors.VIDEO_TILE_NAME) ||
        tile.querySelector(ZoomSelectors.PARTICIPANT_ROW_NAME);
      const tileName = nameEl
        ? nameEl.textContent.trim()
        : tile.getAttribute('aria-label') || tile.getAttribute('title') || '';
      if (tileName.toLowerCase().includes(name.toLowerCase())) {
        targetTile = tile;
        break;
      }
    }

    if (!targetTile) {
      dbg('pinParticipant: tile not found for', name);
      return 'USER_NOT_FOUND';
    }

    _rightClick(targetTile);

    // Wait for context menu
    let menu;
    try {
      menu = await _waitFor(ZoomSelectors.CONTEXT_MENU, 2500);
    } catch (_) {
      dbg('pinParticipant: context menu not found');
      return 'CONTEXT_MENU_NOT_FOUND';
    }

    // Try "Multi-pin" first, then "Pin"
    let pinItem = _findMenuItem(ZoomSelectors.MULTIPIN_OPTION_TEXT);
    if (!pinItem) pinItem = _findMenuItem(ZoomSelectors.PIN_OPTION_TEXT);

    if (!pinItem) {
      dbg('pinParticipant: pin option not found in context menu');
      document.body.click(); // close menu
      return 'PIN_OPTION_NOT_FOUND';
    }

    pinItem.click();
    dbg('pinParticipant: pinned', name);
    return 'MULTIPIN_GRANTED';
  } catch (err) {
    console.error('[Nebulosa:ZoomAdapter] pinParticipant error:', err); // eslint-disable-line no-console
    return 'ERROR';
  }
}

/**
 * Unpin a participant's video using the Zoom context menu.
 * Preserved from zoomBrowserBot.unpinUser().
 *
 * @param {string} name
 * @returns {Promise<'MULTIPIN_REMOVED'|'USER_NOT_FOUND'|'CONTEXT_MENU_NOT_FOUND'|'UNPIN_OPTION_NOT_FOUND'|'ERROR'>}
 */
async function unpinParticipant(name) {
  try {
    dbg('unpinParticipant:', name);

    const tiles = document.querySelectorAll(ZoomSelectors.VIDEO_TILE);
    let targetTile = null;
    for (const tile of tiles) {
      const nameEl =
        tile.querySelector(ZoomSelectors.VIDEO_TILE_NAME) ||
        tile.querySelector(ZoomSelectors.PARTICIPANT_ROW_NAME);
      const tileName = nameEl
        ? nameEl.textContent.trim()
        : tile.getAttribute('aria-label') || tile.getAttribute('title') || '';
      if (tileName.toLowerCase().includes(name.toLowerCase())) {
        targetTile = tile;
        break;
      }
    }

    if (!targetTile) {
      dbg('unpinParticipant: tile not found for', name);
      return 'USER_NOT_FOUND';
    }

    _rightClick(targetTile);

    let menu;
    try {
      menu = await _waitFor(ZoomSelectors.CONTEXT_MENU, 2500);
    } catch (_) {
      return 'CONTEXT_MENU_NOT_FOUND';
    }

    const unpinItem = _findMenuItem(ZoomSelectors.UNPIN_OPTION_TEXT);
    if (!unpinItem) {
      document.body.click();
      return 'UNPIN_OPTION_NOT_FOUND';
    }

    unpinItem.click();
    dbg('unpinParticipant: unpinned', name);
    return 'MULTIPIN_REMOVED';
  } catch (err) {
    console.error('[Nebulosa:ZoomAdapter] unpinParticipant error:', err); // eslint-disable-line no-console
    return 'ERROR';
  }
}

/**
 * Admit a specific participant from the waiting room.
 * @param {string} name
 * @returns {Promise<boolean>}
 */
async function admitParticipant(name) {
  try {
    const panel = document.querySelector(ZoomSelectors.WAITING_ROOM_PANEL);
    if (!panel) return false;
    const rows = panel.querySelectorAll(ZoomSelectors.PARTICIPANT_ROW);
    for (const row of rows) {
      const rowName = row.textContent.trim();
      if (rowName.toLowerCase().includes(name.toLowerCase())) {
        const admitBtn = row.querySelector(ZoomSelectors.WAITING_ROOM_ADMIT_BTN);
        if (admitBtn) {
          admitBtn.click();
          return true;
        }
      }
    }
    return false;
  } catch (err) {
    console.error('[Nebulosa:ZoomAdapter] admitParticipant error:', err); // eslint-disable-line no-console
    return false;
  }
}

// ── Wire up ZoomEvents → EventBus ───────────────────────────────────────────

/**
 * Initialise the adapter: wire DOM events to the event bus and start
 * DOM observation.
 */
function init() {
  ZoomEvents.register({
    onParticipantJoined(payload) {
      bus.emit('participant_joined', payload);
    },
    onParticipantLeft(payload) {
      bus.emit('participant_left', payload);
    },
    onHandRaised(payload) {
      bus.emit('hand_raised', payload);
    },
    onHandLowered(payload) {
      bus.emit('hand_lowered', payload);
    },
    onCameraOn(payload) {
      bus.emit('camera_on', payload);
    },
    onCameraOff(payload) {
      bus.emit('camera_off', payload);
    },
    onChatMessage(payload) {
      bus.emit('chat_message', payload);
    },
    onMeetingDetected(payload) {
      bus.emit('meeting_detected', payload);
    },
    onMeetingEnded(payload) {
      bus.emit('meeting_ended', payload);
    },
  });

  ZoomEvents.start();
  dbg('ZoomAdapter initialised');
}

/** Tear down: stop DOM observation. */
function destroy() {
  ZoomEvents.stop();
  bus.clear();
  dbg('ZoomAdapter destroyed');
}

// CommonJS + browser-global dual export
const ZoomAdapter = { init, destroy, pinParticipant, unpinParticipant, admitParticipant };

if (typeof module !== 'undefined' && module.exports) {
  module.exports = ZoomAdapter;
} else if (typeof window !== 'undefined') {
  window.ZoomAdapter = ZoomAdapter;
}

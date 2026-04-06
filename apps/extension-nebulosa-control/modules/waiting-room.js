/**
 * Waiting Room Module — apps/extension-nebulosa-control/modules/waiting-room.js
 *
 * Automated waiting room management scaffold.
 *
 * Status: SCAFFOLD — No waiting room logic existed in the original
 * Tampermonkey/Puppeteer implementation. This module provides the
 * architecture boundary and a clean API for future implementation.
 *
 * What is implemented:
 *  - Module lifecycle (enable/disable)
 *  - admit() and admitAll() wired to ZoomAdapter
 *
 * What still needs implementation / validation:
 *  - Detecting waiting room entries via DOM events
 *  - Auto-admit rules (e.g. allow-list by display name pattern)
 *  - Notification to host when someone enters the waiting room
 *
 * See docs/tampermonkey-migration.md for full status.
 */

/* global window */

const ZoomAdapter =
  typeof require !== 'undefined'
    ? require('../../../integrations/zoom/adapter')
    : window.ZoomAdapter;

const DEBUG =
  typeof window !== 'undefined' && window.__NEBULOSA_DEBUG === true;

function dbg(...args) {
  if (DEBUG) console.log('[Nebulosa:WaitingRoom]', ...args); // eslint-disable-line no-console
}

let _enabled = false;

function enable() {
  if (_enabled) return;
  _enabled = true;
  dbg('enabled (scaffold)');
  // TODO: subscribe to waiting-room DOM mutation events
}

function disable() {
  if (!_enabled) return;
  _enabled = false;
  dbg('disabled');
}

function isEnabled() {
  return _enabled;
}

/**
 * Admit a specific participant by display name.
 * @param {string} name
 * @returns {Promise<boolean>}
 */
async function admit(name) {
  dbg('admit:', name);
  return ZoomAdapter.admitParticipant(name);
}

/**
 * Admit all participants currently in the waiting room.
 * @returns {Promise<boolean>}
 */
async function admitAll() {
  dbg('admitAll');
  return ZoomAdapter.admitAll();
}

// CommonJS + browser-global dual export
const WaitingRoomModule = { enable, disable, isEnabled, admit, admitAll };

if (typeof module !== 'undefined' && module.exports) {
  module.exports = WaitingRoomModule;
} else if (typeof window !== 'undefined') {
  window.NebulosaWaitingRoom = WaitingRoomModule;
}

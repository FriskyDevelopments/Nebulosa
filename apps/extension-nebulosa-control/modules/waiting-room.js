/**
 * Waiting Room Module — apps/extension-nebulosa-control/modules/waiting-room.js
 *
 * Automated waiting room management scaffold.
 *
 * Status: ACTIVE
 *
 * What is implemented:
 *  - Module lifecycle (enable/disable)
 *  - admit() and admitAll() wired to ZoomAdapter
 *  - Detecting waiting room entries via DOM events
 *
 * What still needs implementation / validation:
 *  - Auto-admit rules (e.g. allow-list by display name pattern)
 *  - Notification to host when someone enters the waiting room
 */

/* global window, document, MutationObserver */

const bus =
  typeof require !== 'undefined'
    ? require('../../../packages/event-bus')
    : window.NebulosaBus;

const ZoomAdapter =
  typeof require !== 'undefined'
    ? require('../../../integrations/zoom/adapter')
    : window.ZoomAdapter;

const ZoomSelectors =
  typeof require !== 'undefined'
    ? require('../../../integrations/zoom/selectors')
    : window.ZoomSelectors;

const DEBUG =
  typeof window !== 'undefined' && window.__NEBULOSA_DEBUG === true;

function dbg(...args) {
  if (DEBUG) console.log('[Nebulosa:WaitingRoom]', ...args); // eslint-disable-line no-console
}

function _queryFirst(selectors, root = document) {
  if (!selectors) return null;
  const list = Array.isArray(selectors) ? selectors : [selectors];
  for (const selector of list) {
    const found = root.querySelector(selector);
    if (found) return found;
  }
  return null;
}

let _enabled = false;
const _unsubs = [];
function enable() {
  if (_enabled) return;
  _enabled = true;
  _unsubs.push(
    bus.on('waiting_room_joined', _onWaitingRoomJoined),
    bus.on('waiting_room_left', _onWaitingRoomLeft)
  );
  dbg('enabled');}

function disable() {
  if (!_enabled) return;
  _enabled = false;
  _unsubs.forEach((unsub) => unsub());
  _unsubs.length = 0;  dbg('disabled');
}

function isEnabled() {
  return _enabled;
}

function _onWaitingRoomJoined({ name }) {
  dbg('waiting room joined by', name);
  // TODO: Auto-admit rules (e.g. allow-list by display name pattern)
  // TODO: Notification to host when someone enters the waiting room
}

function _onWaitingRoomLeft({ name }) {
  dbg('waiting room left by', name);
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
 * @returns {Promise<void>} */
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

/**
 * Background Service Worker — apps/extension-nebulosa-control/background.js
 *
 * Manifest V3 background service worker.
 *
 * Responsibilities:
 *  - Relay messages between content script and popup
 *  - Cache last-known meeting status so popup can display it even when
 *    the content script hasn't sent a recent update
 *  - Reset stale status when the Zoom tab navigates away or closes
 *  - Log debug events
 */

/* global chrome, console */

const DEBUG = false; // Set to true for verbose background logging

function dbg(...args) {
  if (DEBUG) console.log('[Nebulosa:Background]', ...args); // eslint-disable-line no-console
}

// ── State cache ───────────────────────────────────────────────────────────────

let _lastStatus = {
  meetingDetected: false,
  multipin: false,
  cameraMonitor: false,
  moderation: false,
  waitingRoom: false,
  pinned: [],
};

/**
 * Tab ID of the most recent Zoom tab that sent a CONTENT_STATUS message.
 * Used to route TOGGLE_MODULE to the correct tab when multiple Zoom tabs are open.
 * @type {number|null}
 */
let _activeZoomTabId = null;

// ── Status helpers ────────────────────────────────────────────────────────────

function _resetStatus() {
  _lastStatus = {
    meetingDetected: false,
    multipin: false,
    cameraMonitor: false,
    moderation: false,
    waitingRoom: false,
    pinned: [],
  };
  _broadcastStatus();
}

/**
 * Broadcast current status to the popup (if open).
 * Uses callback form so it works in all MV3 environments.
 */
function _broadcastStatus() {
  chrome.runtime.sendMessage({ type: 'STATUS_UPDATE', ..._lastStatus }, () => {
    // Suppress "no receiver" error when popup is closed
    void chrome.runtime.lastError;
  });
}

// ── Tab lifecycle — reset stale status ───────────────────────────────────────

chrome.tabs.onRemoved.addListener((tabId) => {
  if (tabId === _activeZoomTabId) {
    dbg('Active Zoom tab closed — resetting status');
    _activeZoomTabId = null;
    _resetStatus();
  }
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (tabId !== _activeZoomTabId) return;
  if (changeInfo.url && !/zoom\.us\/(wc|j)\//i.test(changeInfo.url)) {
    dbg('Active Zoom tab navigated away — resetting status');
    _activeZoomTabId = null;
    _resetStatus();
  }
});

// ── Message routing ───────────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  dbg('Message from', sender.tab ? `tab ${sender.tab.id}` : 'popup', ':', message.type);

  if (message.type === 'CONTENT_STATUS') {
    // Track which Zoom tab is the active source of truth
    if (sender.tab) _activeZoomTabId = sender.tab.id;
    _lastStatus = { ..._lastStatus, ...message };
    delete _lastStatus.type;
    dbg('Status updated:', _lastStatus);
    _broadcastStatus();
    return false;
  }

  if (message.type === 'GET_STATUS') {
    sendResponse(_lastStatus);
    return false;
  }

  if (message.type === 'TOGGLE_MODULE') {
    // Popup toggling a module — forward to the tracked active Zoom tab
    _forwardToZoomTab(message, sendResponse);
    return true; // async response
  }

  sendResponse({ ok: false, error: 'Unknown message type' });
  return false;
});

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Forward a message to the content script in the active Zoom tab.
 * Prefers the tracked tab; falls back to querying all Zoom tabs.
 */
async function _forwardToZoomTab(message, sendResponse) {
  try {
    let tabId = _activeZoomTabId;

    if (!tabId) {
      const tabs = await chrome.tabs.query({ url: ['*://*.zoom.us/*'] });
      if (!tabs.length) {
        sendResponse({ ok: false, error: 'No Zoom tab found' });
        return;
      }
      tabId = tabs[0].id;
    }

    const response = await chrome.tabs.sendMessage(tabId, message);
    sendResponse(response);
  } catch (err) {
    dbg('forwardToZoomTab error:', err);
    sendResponse({ ok: false, error: err.message });
  }
}


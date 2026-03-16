/**
 * Background Service Worker — apps/extension-nebulosa-control/background.js
 *
 * Manifest V3 background service worker.
 *
 * Responsibilities:
 *  - Relay messages between content script and popup
 *  - Cache last-known meeting status so popup can display it even when
 *    the content script hasn't sent a recent update
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

// ── Message routing ───────────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  dbg('Message from', sender.tab ? `tab ${sender.tab.id}` : 'popup', ':', message.type);

  if (message.type === 'CONTENT_STATUS') {
    // Content script is reporting its current state
    _lastStatus = { ..._lastStatus, ...message };
    delete _lastStatus.type;
    dbg('Status updated:', _lastStatus);
    // Forward to any open popups
    chrome.runtime.sendMessage({ type: 'STATUS_UPDATE', ..._lastStatus }).catch(() => {
      // No popup open — ignore
    });
    return false;
  }

  if (message.type === 'GET_STATUS') {
    // Popup asking for the current status
    sendResponse(_lastStatus);
    return false;
  }

  if (message.type === 'TOGGLE_MODULE') {
    // Popup toggling a module — forward to the active Zoom tab
    _forwardToZoomTab(message, sendResponse);
    return true; // async response
  }

  sendResponse({ ok: false, error: 'Unknown message type' });
  return false;
});

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Forward a message to the content script in the active Zoom tab.
 */
async function _forwardToZoomTab(message, sendResponse) {
  try {
    const tabs = await chrome.tabs.query({ url: ['*://*.zoom.us/*'] });
    if (!tabs.length) {
      sendResponse({ ok: false, error: 'No Zoom tab found' });
      return;
    }
    const response = await chrome.tabs.sendMessage(tabs[0].id, message);
    sendResponse(response);
  } catch (err) {
    dbg('forwardToZoomTab error:', err);
    sendResponse({ ok: false, error: err.message });
  }
}

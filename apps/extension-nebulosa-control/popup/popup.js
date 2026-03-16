/**
 * Popup Script — apps/extension-nebulosa-control/popup/popup.js
 *
 * Displays live meeting status and module toggles.
 * Communicates with background.js which relays to the content script.
 */

/* global chrome, document */

// ── DOM refs ──────────────────────────────────────────────────────────────────
const statusDot = document.getElementById('status-dot');
const statusText = document.getElementById('status-text');
const pinnedList = document.getElementById('pinned-list');
const pinnedNames = document.getElementById('pinned-names');

const toggles = {
  multipin: document.getElementById('toggle-multipin'),
  cameraMonitor: document.getElementById('toggle-cameraMonitor'),
  moderation: document.getElementById('toggle-moderation'),
  waitingRoom: document.getElementById('toggle-waitingRoom'),
};

// ── Load initial status ───────────────────────────────────────────────────────
chrome.runtime.sendMessage({ type: 'GET_STATUS' }, (status) => {
  if (chrome.runtime.lastError || !status) {
    _setStatus(false, 'Extension error — reload page');
    return;
  }
  _applyStatus(status);
});

// ── Listen for live updates from background ───────────────────────────────────
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === 'STATUS_UPDATE') {
    _applyStatus(message);
  }
});

// ── Toggle change handlers ────────────────────────────────────────────────────
Object.entries(toggles).forEach(([mod, input]) => {
  input.addEventListener('change', () => {
    chrome.runtime.sendMessage(
      { type: 'TOGGLE_MODULE', module: mod, enabled: input.checked },
      (response) => {
        if (chrome.runtime.lastError || !response || !response.ok) {
          // Revert on error
          input.checked = !input.checked;
        }
      }
    );
  });
});

// ── Helpers ───────────────────────────────────────────────────────────────────

function _applyStatus(status) {
  const detected = !!status.meetingDetected;
  _setStatus(
    detected,
    detected ? 'Zoom meeting detected' : 'Not on a supported Zoom page'
  );

  // Disable toggles when no meeting is active
  Object.values(toggles).forEach((t) => {
    t.disabled = !detected;
  });

  if (detected) {
    toggles.multipin.checked = !!status.multipin;
    toggles.cameraMonitor.checked = !!status.cameraMonitor;
    toggles.moderation.checked = !!status.moderation;
    toggles.waitingRoom.checked = !!status.waitingRoom;
  }

  // Show pinned participants list
  const pinned = Array.isArray(status.pinned) ? status.pinned : [];
  if (detected && pinned.length > 0) {
    pinnedList.classList.remove('hidden');
    pinnedNames.textContent = pinned.join(', ');
  } else {
    pinnedList.classList.add('hidden');
  }
}

function _setStatus(active, text) {
  statusDot.className = 'status-dot' + (active ? ' active' : '');
  statusText.textContent = text;
}

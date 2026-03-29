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

// Diagnostics
const diagToggleBtn = document.getElementById('diag-toggle');
const diagArrow = document.getElementById('diag-arrow');
const diagPanel = document.getElementById('diag-panel');
const diagSurface = document.getElementById('diag-surface');
const diagMeetingState = document.getElementById('diag-meeting-state');
const diagRole = document.getElementById('diag-role');
const diagPanelFound = document.getElementById('diag-panel-found');
const diagRows = document.getElementById('diag-rows');
const diagHandSource = document.getElementById('diag-hand-source');
const diagCameraSource = document.getElementById('diag-camera-source');
const diagArmed = document.getElementById('diag-armed');
const diagReason = document.getElementById('diag-reason');
const diagObservers = document.getElementById('diag-observers');
const diagLastEvent = document.getElementById('diag-last-event');
const diagEventTime = document.getElementById('diag-event-time');

const toggles = {
  multipin: document.getElementById('toggle-multipin'),
  cameraMonitor: document.getElementById('toggle-cameraMonitor'),
  moderation: document.getElementById('toggle-moderation'),
  waitingRoom: document.getElementById('toggle-waitingRoom'),
};

// ── Diagnostics toggle ────────────────────────────────────────────────────────
diagToggleBtn.addEventListener('click', () => {
  const open = diagPanel.classList.toggle('visible');
  diagArrow.classList.toggle('open', open);
});

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
  const detected = !!status.automationArmed;
  _setStatus(detected, _humanStatus(status));

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

  // Diagnostics
  _updateDiagnostics(status);
}


function _humanStatus(status) {
  if (status.surface === 'not_zoom') return 'Not on a Zoom page';
  if (status.meetingState === 'zoom_not_meeting') return 'Zoom page detected, but not inside an active meeting';
  if (status.meetingState === 'joining_meeting') return 'Joining meeting — waiting for Zoom UI';
  if (status.meetingState === 'in_meeting_dom_not_ready') return 'Meeting detected, participant panel not available yet';
  if (status.meetingState === 'in_meeting_unsupported_layout') return 'Meeting detected, but current Zoom layout is unsupported';
  if (status.meetingState === 'in_meeting_ready' && !status.hostCapable) return 'Meeting detected, but host/cohost permissions not found';
  if (status.automationArmed) return 'Automation armed and observing meeting';
  return 'Waiting for supported Zoom state';
}

function _updateDiagnostics(status) {
  diagSurface.textContent = status.surface || '—';
  diagMeetingState.textContent = status.meetingState || '—';
  diagRole.textContent = status.role || '—';
  diagPanelFound.textContent = status.participantPanelFound ? 'yes' : 'no';
  diagRows.textContent = String(status.participantRowsFound ?? 0);
  diagHandSource.textContent = status.handRaiseSourceDetected ? 'yes' : 'no';
  diagCameraSource.textContent = status.cameraStateSourceDetected ? 'yes' : 'no';
  diagArmed.textContent = status.automationArmed ? 'yes' : 'no';
  diagReason.textContent = status.lastFailureReason || status.unsupportedReason || '—';

  const active = !!status.observersActive;
  diagObservers.textContent = active ? 'active' : 'inactive';
  diagObservers.className = 'diag-val ' + (active ? 'ok' : 'warn');

  if (status.lastEvent) {
    const { type, payload, ts } = status.lastEvent;
    diagLastEvent.textContent = `${type}${payload?.name ? ` — ${payload.name}` : ''}`;
    diagLastEvent.className = 'diag-val ok';
    if (ts) {
      const ago = Math.round((Date.now() - ts) / 1000);
      diagEventTime.textContent = ago < 60 ? `${ago}s ago` : `${Math.round(ago / 60)}m ago`;
    }
  } else {
    diagLastEvent.textContent = 'none';
    diagLastEvent.className = 'diag-val';
    diagEventTime.textContent = '—';
  }
}

function _setStatus(active, text) {
  statusDot.className = 'status-dot' + (active ? ' active' : '');
  statusText.textContent = text;
}

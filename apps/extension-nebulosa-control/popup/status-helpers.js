/**
 * Popup status helpers for human messaging and control interactivity.
 */

function canInteractWithToggles(status = {}) {
  const surface = status.surface || 'unknown';
  if (surface === 'not_zoom' || surface === 'unknown') return false;

  const meetingState = status.meetingState || 'unknown';
  const meetingLikeStates = new Set([
    'joining_meeting',
    'in_meeting_dom_not_ready',
    'in_meeting_ready',
    'in_meeting_unsupported_layout',
  ]);

  return meetingLikeStates.has(meetingState) || meetingState === 'zoom_not_meeting' || status.meetingDetected === true;
}

function humanStatus(status = {}) {
  if ((status.lastFailureReason || '').startsWith('bootstrap_failed:')) return 'Automation failed to initialize — reload Zoom tab';
  if (status.surface === 'not_zoom') return 'Not on a Zoom page';
  if (status.meetingState === 'zoom_not_meeting') return 'Zoom page detected, but not inside an active meeting';

  if (status.meetingState === 'joining_meeting') {
    if (status.reason === 'waiting_room_detected') return 'In waiting room — waiting for host admission';
    return 'Joining meeting — waiting for Zoom UI';
  }

  if (status.meetingState === 'in_meeting_dom_not_ready') {
    if (status.reason === 'participant_panel_missing') return 'In meeting — participant panel not detected yet';
    if (status.reason === 'toolbar_missing') return 'In meeting — host controls not detected yet';
    return 'In meeting — Zoom controls are still loading';
  }

  if (status.meetingState === 'in_meeting_unsupported_layout') {
    return 'In meeting, but current Zoom layout is unsupported';
  }

  if (status.meetingState === 'in_meeting_ready' && !status.hostCapable) {
    return 'In meeting as attendee — host/cohost permissions not found';
  }

  if (status.automationArmed) return 'Automation armed and observing meeting';
  return 'Waiting for supported Zoom state';
}

const PopupStatusHelpers = { canInteractWithToggles, humanStatus };

if (typeof module !== 'undefined' && module.exports) {
  module.exports = PopupStatusHelpers;
} else if (typeof window !== 'undefined') {
  window.PopupStatusHelpers = PopupStatusHelpers;
}

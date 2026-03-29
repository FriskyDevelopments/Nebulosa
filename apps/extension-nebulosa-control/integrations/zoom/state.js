/**
 * Zoom State + Capability Detection — integrations/zoom/state.js
 *
 * Centralized logic for classifying Zoom surface, meeting readiness,
 * role/capability detection, and selector diagnostics.
 */

/* global window, document */

const ZoomSelectors =
  typeof require !== 'undefined' ? require('./selectors') : window.ZoomSelectors;
const ZoomWcProbe =
  typeof require !== 'undefined' ? require('./wc-probe') : window.ZoomWcProbe;

const MeetingState = {
  NOT_ZOOM: 'not_zoom',
  ZOOM_NOT_MEETING: 'zoom_not_meeting',
  LOADING: 'loading',
  PREJOIN: 'prejoin',
  JOINING: 'joining_meeting',
  IN_MEETING_DOM_NOT_READY: 'in_meeting_dom_not_ready',
  IN_MEETING_READY: 'in_meeting_ready',
  IN_MEETING_UNSUPPORTED_LAYOUT: 'in_meeting_unsupported_layout',
  ENDED: 'ended',
  UNSUPPORTED: 'unsupported',
};

const RoleState = {
  UNKNOWN: 'unknown',
  ATTENDEE: 'attendee',
  HOST: 'host',
  COHOST: 'cohost',
};

function _safeUrl(urlString) {
  try {
    return new URL(urlString);
  } catch (_) {
    return null;
  }
}

function classifySurface(urlString = window.location.href) {
  const parsed = _safeUrl(urlString);
  if (!parsed) return 'not_zoom';
  const host = parsed.hostname || '';
  const path = parsed.pathname || '';
  const isZoom = host === 'app.zoom.us' || host === 'zoom.us' || host.endsWith('.zoom.us');
  if (!isZoom) return 'not_zoom';

  if (/^\/wc\//i.test(path)) return 'zoom_web_client';
  if (/^\/j\//i.test(path)) return 'legacy_j';
  return 'zoom_other';
}

function _anySelector(selectors, root = document) {
  for (const selector of selectors) {
    if (root.querySelector(selector)) return true;
  }
  return false;
}

function _queryFirst(selectors, root = document) {
  for (const selector of selectors) {
    const found = root.querySelector(selector);
    if (found) return found;
  }
  return null;
}

function _queryAll(selectors, root = document) {
  const out = [];
  for (const selector of selectors) {
    const list = root.querySelectorAll(selector);
    if (list.length) return Array.from(list);
  }
  return out;
}

function detectRole() {
  const hostBadge = _queryFirst(ZoomSelectors.ROLE_HOST_BADGE);
  if (hostBadge) return RoleState.HOST;

  const cohostBadge = _queryFirst(ZoomSelectors.ROLE_COHOST_BADGE);
  if (cohostBadge) return RoleState.COHOST;

  const hostMenuControl = _queryFirst(ZoomSelectors.HOST_ONLY_CONTROL);
  if (hostMenuControl) return RoleState.HOST;

  const participantText = (document.body?.innerText || '').toLowerCase();
  if (participantText.includes('you are host')) return RoleState.HOST;
  if (participantText.includes('you are co-host') || participantText.includes('you are cohost')) return RoleState.COHOST;
  if (participantText.includes('you are attendee')) return RoleState.ATTENDEE;

  return RoleState.UNKNOWN;
}

function _looksLikeWaitingRoom() {
  const participantText = (document.body?.innerText || '').toLowerCase();
  return participantText.includes('waiting room')
    || participantText.includes('waiting for the host')
    || participantText.includes('host will let you in');
}

function detectMeetingReadiness() {
  const surface = classifySurface();
  if (surface === 'not_zoom') {
    return { surface, meetingState: MeetingState.NOT_ZOOM, reason: 'not_zoom_domain' };
  }
  if (surface === 'zoom_other') {
    return { surface, meetingState: MeetingState.ZOOM_NOT_MEETING, reason: 'not_meeting_surface' };
  }
  if (surface !== 'zoom_web_client') {
    return { surface, meetingState: MeetingState.UNSUPPORTED, reason: 'surface_not_supported' };
  }

  const wc = ZoomWcProbe.probeWebClientDom();
  if (wc.endedFound) {
    return { surface, meetingState: MeetingState.ENDED, reason: 'meeting_ended' };
  }
  if (wc.prejoinFound) {
    return { surface, meetingState: MeetingState.PREJOIN, reason: 'prejoin_detected' };
  }
  if (!wc.meetingRootFound && _looksLikeWaitingRoom()) {
    return { surface, meetingState: MeetingState.JOINING, reason: 'waiting_room_detected' };
  }
  if (!wc.meetingRootFound) {
    return { surface, meetingState: MeetingState.LOADING, reason: 'meeting_shell_not_loaded' };
  }

  if (!wc.participantPanelFound || !wc.controlBarFound) {
    return {
      surface,
      meetingState: MeetingState.IN_MEETING_DOM_NOT_READY,
      reason: !wc.participantPanelFound ? 'participant_panel_missing' : 'toolbar_missing',
      participantRowCount: wc.participantRowsFound,
    };
  }

  if (wc.participantRowsFound === 0 && wc.videoTilesFound === 0) {
    return {
      surface,
      meetingState: MeetingState.IN_MEETING_UNSUPPORTED_LAYOUT,
      reason: 'participant_rows_missing',
      participantRowCount: 0,
    };
  }

  return {
    surface,
    meetingState: MeetingState.IN_MEETING_READY,
    reason: 'meeting_ready',
    participantRowCount: wc.participantRowsFound,
  };
}

function detectCapabilities() {
  const readiness = detectMeetingReadiness();
  const role = detectRole();

  const participantPanel = readiness.surface === 'zoom_web_client'
    ? _queryFirst(ZoomSelectors.WC_PARTICIPANTS_PANEL)
    : _queryFirst(ZoomSelectors.PARTICIPANTS_PANEL);
  const rows = participantPanel
    ? _queryAll(ZoomSelectors.WC_PARTICIPANT_ROW, participantPanel)
    : _queryAll(readiness.surface === 'zoom_web_client' ? ZoomSelectors.WC_PARTICIPANT_ROW : ZoomSelectors.PARTICIPANT_ROW);

  const hasHandSource = rows.some((row) => _queryFirst(ZoomSelectors.HAND_RAISED_INDICATOR, row));
  const cameraTiles = readiness.surface === 'zoom_web_client'
    ? _queryAll(ZoomSelectors.WC_VIDEO_TILE)
    : _queryAll(ZoomSelectors.VIDEO_TILE);
  const hasCameraSource = cameraTiles.length > 0;

  const hostCapable = role === RoleState.HOST || role === RoleState.COHOST;

  return {
    ...readiness,
    role,
    hostCapable,
    participantPanelFound: !!participantPanel,
    participantRowsFound: rows.length,
    handRaiseSourceDetected: hasHandSource,
    cameraStateSourceDetected: hasCameraSource,
    automationArmed: readiness.meetingState === MeetingState.IN_MEETING_READY && hostCapable,
    partialSupport: readiness.meetingState === MeetingState.IN_MEETING_READY && !hostCapable && readiness.surface === 'zoom_web_client',
    unsupportedReason: !hostCapable && readiness.meetingState === MeetingState.IN_MEETING_READY
      ? 'host_permissions_not_found'
      : readiness.meetingState === MeetingState.IN_MEETING_UNSUPPORTED_LAYOUT
      ? readiness.reason
      : '',
  };
}

const ZoomState = {
  MeetingState,
  RoleState,
  classifySurface,
  detectMeetingReadiness,
  detectCapabilities,
  detectRole,
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = ZoomState;
} else if (typeof window !== 'undefined') {
  window.ZoomState = ZoomState;
}

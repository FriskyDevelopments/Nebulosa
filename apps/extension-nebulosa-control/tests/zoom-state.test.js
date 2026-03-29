const test = require('node:test');
const assert = require('node:assert/strict');

function mkDoc({ selectors = {}, text = '' } = {}) {
  return {
    body: { innerText: text },
    querySelector(sel) {
      const value = selectors[sel] || [];
      return value[0] || null;
    },
    querySelectorAll(sel) {
      return selectors[sel] || [];
    },
  };
}

const selectorModule = require('../integrations/zoom/selectors');

function mkEl() {
  return {
    querySelector() { return null; },
    querySelectorAll() { return []; },
    getAttribute() { return ''; },
    textContent: '',
  };
}

test('classifySurface identifies wc and non-zoom surfaces', () => {
  global.window = { location: { href: 'https://app.zoom.us/wc/123/join' } };
  global.document = mkDoc();
  const ZoomState = require('../integrations/zoom/state');

  assert.equal(ZoomState.classifySurface('https://app.zoom.us/wc/123/join'), 'zoom_web_client');
  assert.equal(ZoomState.classifySurface('https://app.zoom.us/wc/123/start'), 'zoom_web_client');
  assert.equal(ZoomState.classifySurface('https://example.com/'), 'not_zoom');
});

test('readiness reports dom-not-ready when participant panel is absent', () => {
  global.window = { location: { href: 'https://app.zoom.us/wc/123/start' } };
  const selectors = {};
  selectors[selectorModule.WC_MEETING_ROOT[0]] = [mkEl()];
  global.document = mkDoc({ selectors });

  const ZoomState = require('../integrations/zoom/state');
  const result = ZoomState.detectMeetingReadiness();
  assert.equal(result.meetingState, ZoomState.MeetingState.IN_MEETING_DOM_NOT_READY);
  assert.equal(result.reason, 'participant_panel_missing');
});

test('readiness reports waiting room when waiting-room copy is present', () => {
  global.window = { location: { href: 'https://app.zoom.us/wc/123/start' } };
  global.document = mkDoc({ text: 'Please wait, the host will let you in from the waiting room.' });

  const ZoomState = require('../integrations/zoom/state');
  const result = ZoomState.detectMeetingReadiness();
  assert.equal(result.meetingState, ZoomState.MeetingState.JOINING);
  assert.equal(result.reason, 'waiting_room_detected');
});

test('wc readiness classifies prejoin and ended states', () => {
  global.window = { location: { href: 'https://app.zoom.us/wc/123/start' } };
  const selectors = {};
  selectors[selectorModule.WC_PREJOIN_ROOT[0]] = [mkEl()];
  global.document = mkDoc({ selectors });
  const ZoomState = require('../integrations/zoom/state');
  const prejoin = ZoomState.detectMeetingReadiness();
  assert.equal(prejoin.meetingState, ZoomState.MeetingState.PREJOIN);

  delete selectors[selectorModule.WC_PREJOIN_ROOT[0]];
  selectors[selectorModule.WC_ENDED_BANNER[0]] = [mkEl()];
  const ended = ZoomState.detectMeetingReadiness();
  assert.equal(ended.meetingState, ZoomState.MeetingState.ENDED);
});

test('readiness reports loading before wc anchors appear, then ready after delayed dom', () => {
  global.window = { location: { href: 'https://app.zoom.us/wc/123/start' } };
  const selectors = {};
  global.document = mkDoc({ selectors });
  const ZoomState = require('../integrations/zoom/state');

  const first = ZoomState.detectMeetingReadiness();
  assert.equal(first.meetingState, ZoomState.MeetingState.LOADING);

  selectors[selectorModule.WC_MEETING_ROOT[0]] = [mkEl()];
  selectors[selectorModule.WC_PARTICIPANTS_PANEL[0]] = [{
    querySelector: () => null,
    querySelectorAll: (sel) => (sel === selectorModule.WC_PARTICIPANT_ROW[0] ? [mkEl()] : []),
  }];
  selectors[selectorModule.WC_PARTICIPANT_ROW[0]] = [mkEl()];
  selectors[selectorModule.WC_CONTROL_BAR[0]] = [mkEl()];
  const second = ZoomState.detectMeetingReadiness();
  assert.equal(second.meetingState, ZoomState.MeetingState.IN_MEETING_READY);
});

test('capability detects host-capable ready state', () => {
  global.window = { location: { href: 'https://app.zoom.us/wc/123/start' } };
  const selectors = {};
  selectors[selectorModule.WC_MEETING_ROOT[0]] = [mkEl()];
  selectors[selectorModule.WC_PARTICIPANTS_PANEL[0]] = [{
    querySelector: () => null,
    querySelectorAll: (sel) => (sel === selectorModule.WC_PARTICIPANT_ROW[0] ? [mkEl(), mkEl()] : []),
  }];
  selectors[selectorModule.WC_PARTICIPANT_ROW[0]] = [mkEl(), mkEl()];
  selectors[selectorModule.WC_CONTROL_BAR[0]] = [mkEl()];
  selectors[selectorModule.ROLE_HOST_BADGE[0]] = [mkEl()];
  selectors[selectorModule.WC_VIDEO_TILE[0]] = [mkEl()];
  global.document = mkDoc({ selectors, text: 'you are host' });

  const ZoomState = require('../integrations/zoom/state');
  const result = ZoomState.detectCapabilities();
  assert.equal(result.meetingState, ZoomState.MeetingState.IN_MEETING_READY);
  assert.equal(result.hostCapable, true);
  assert.equal(result.automationArmed, true);
});

test('capability reports attendee in ready meeting as not automation-armed', () => {
  global.window = { location: { href: 'https://app.zoom.us/wc/123/start' } };
  const selectors = {};
  selectors[selectorModule.WC_MEETING_ROOT[0]] = [mkEl()];
  selectors[selectorModule.WC_PARTICIPANTS_PANEL[0]] = [{
    querySelector: () => null,
    querySelectorAll: (sel) => (sel === selectorModule.WC_PARTICIPANT_ROW[0] ? [mkEl()] : []),
  }];
  selectors[selectorModule.WC_PARTICIPANT_ROW[0]] = [mkEl()];
  selectors[selectorModule.WC_CONTROL_BAR[0]] = [mkEl()];
  global.document = mkDoc({ selectors, text: 'you are attendee' });

  const ZoomState = require('../integrations/zoom/state');
  const result = ZoomState.detectCapabilities();
  assert.equal(result.meetingState, ZoomState.MeetingState.IN_MEETING_READY);
  assert.equal(result.hostCapable, false);
  assert.equal(result.automationArmed, false);
  assert.equal(result.unsupportedReason, 'host_permissions_not_found');
});

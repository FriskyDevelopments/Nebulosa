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

  assert.equal(ZoomState.classifySurface('https://app.zoom.us/wc/123/join'), 'wc_join');
  assert.equal(ZoomState.classifySurface('https://app.zoom.us/wc/123/start'), 'wc_meeting');
  assert.equal(ZoomState.classifySurface('https://example.com/'), 'not_zoom');
});

test('readiness reports dom-not-ready when participant panel is absent', () => {
  global.window = { location: { href: 'https://app.zoom.us/wc/123/start' } };
  const selectors = {};
  selectors[selectorModule.MEETING_ROOT[0]] = [mkEl()];
  global.document = mkDoc({ selectors });

  const ZoomState = require('../integrations/zoom/state');
  const result = ZoomState.detectMeetingReadiness();
  assert.equal(result.meetingState, ZoomState.MeetingState.IN_MEETING_DOM_NOT_READY);
  assert.equal(result.reason, 'participant_panel_missing');
});

test('capability detects host-capable ready state', () => {
  global.window = { location: { href: 'https://app.zoom.us/wc/123/start' } };
  const selectors = {};
  selectors[selectorModule.MEETING_ROOT[0]] = [mkEl()];
  selectors[selectorModule.PARTICIPANTS_PANEL[0]] = [{
    querySelector: (sel) => null,
    querySelectorAll: (sel) => (sel === selectorModule.PARTICIPANT_ROW[0] ? [mkEl(), mkEl()] : []),
  }];
  selectors[selectorModule.PARTICIPANT_ROW[0]] = [mkEl(), mkEl()];
  selectors[selectorModule.TOOLBAR[0]] = [mkEl()];
  selectors[selectorModule.ROLE_HOST_BADGE[0]] = [mkEl()];
  selectors[selectorModule.VIDEO_TILE[0]] = [mkEl()];
  global.document = mkDoc({ selectors, text: 'you are host' });

  const ZoomState = require('../integrations/zoom/state');
  const result = ZoomState.detectCapabilities();
  assert.equal(result.meetingState, ZoomState.MeetingState.IN_MEETING_READY);
  assert.equal(result.hostCapable, true);
  assert.equal(result.automationArmed, true);
});

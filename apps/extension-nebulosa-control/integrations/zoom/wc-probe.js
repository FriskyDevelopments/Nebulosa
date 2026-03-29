/* global window, document */

const ZoomSelectors = typeof require !== 'undefined' ? require('./selectors') : window.ZoomSelectors;

function _queryFirst(selectors, root = document) {
  for (const selector of selectors) {
    const found = root.querySelector(selector);
    if (found) return found;
  }
  return null;
}

function _queryAll(selectors, root = document) {
  for (const selector of selectors) {
    const nodes = root.querySelectorAll(selector);
    if (nodes.length) return Array.from(nodes);
  }
  return [];
}

function probeWebClientDom() {
  const meetingRoot = _queryFirst(ZoomSelectors.WC_MEETING_ROOT);
  const participantPanel = _queryFirst(ZoomSelectors.WC_PARTICIPANTS_PANEL);
  const participantRows = participantPanel
    ? _queryAll(ZoomSelectors.WC_PARTICIPANT_ROW, participantPanel)
    : _queryAll(ZoomSelectors.WC_PARTICIPANT_ROW);
  const controlBar = _queryFirst(ZoomSelectors.WC_CONTROL_BAR);
  const videoTiles = _queryAll(ZoomSelectors.WC_VIDEO_TILE);
  const prejoinRoot = _queryFirst(ZoomSelectors.WC_PREJOIN_ROOT);
  const endedBanner = _queryFirst(ZoomSelectors.WC_ENDED_BANNER);

  return {
    meetingRootFound: !!meetingRoot,
    participantPanelFound: !!participantPanel,
    participantRowsFound: participantRows.length,
    controlBarFound: !!controlBar,
    videoTilesFound: videoTiles.length,
    prejoinFound: !!prejoinRoot,
    endedFound: !!endedBanner,
  };
}

const ZoomWcProbe = { probeWebClientDom };

if (typeof module !== 'undefined' && module.exports) {
  module.exports = ZoomWcProbe;
} else if (typeof window !== 'undefined') {
  window.ZoomWcProbe = ZoomWcProbe;
}

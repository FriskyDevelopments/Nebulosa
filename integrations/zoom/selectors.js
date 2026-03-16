/**
 * Zoom DOM Selectors — integrations/zoom/selectors.js
 *
 * Centralises every CSS selector used to interact with the Zoom Web Client.
 * If Zoom updates its UI, update this file only.
 *
 * NOTE: Zoom's web client is a React SPA. Selectors rely on stable
 * aria-labels, data-testid attributes, and class name fragments.
 * Pure class-name selectors are fragile; prefer aria / data-* whenever
 * possible. Comments indicate known fragility and when last validated.
 *
 * Last validated: 2024-Q4 Zoom Web Client (5.x)
 */

const ZoomSelectors = {
  // ── Meeting container ─────────────────────────────────────────────────────
  /** Root element that confirms we are inside an active Zoom meeting. */
  MEETING_ROOT: '#wc-container-left, [class*="meeting-client"], #zoom-meeting-root',

  // ── Participant / video tiles ─────────────────────────────────────────────
  /**
   * Individual video tiles in the gallery view.
   * Used as the starting point for per-participant operations.
   * NOTE: may change between minor Zoom releases.
   */
  VIDEO_TILE: '.video-avatar__avatar, [class*="video-avatar"], [class*="video-tile"]',

  /** Display name label inside a video tile. */
  VIDEO_TILE_NAME: '[class*="display-name"], [class*="participant-name"]',

  // ── Participants panel ────────────────────────────────────────────────────
  PARTICIPANTS_PANEL: '#participants-panel, [aria-label*="Participants"], [class*="participants-panel"]',

  /** A single row in the participants panel. */
  PARTICIPANT_ROW: '[class*="participants-item"], [class*="participant-item"]',

  /** Name label within a participant row. */
  PARTICIPANT_ROW_NAME: '[class*="participants-item__display-name"], [class*="participant__name"]',

  /**
   * Hand-raised indicator on a participant row or video tile.
   * Zoom renders this as an SVG icon or a highlighted element.
   */
  HAND_RAISED_INDICATOR: '[class*="hand-raise"], [aria-label*="Raise Hand"], [class*="raise-hand"]',

  /**
   * Camera-off indicator on a video tile.
   * Present when the participant's video is disabled.
   */
  CAMERA_OFF_INDICATOR: '[class*="video-off"], [aria-label*="camera off"], [class*="avatar--camera-off"]',

  // ── Waiting room ─────────────────────────────────────────────────────────
  WAITING_ROOM_PANEL: '[aria-label*="Waiting Room"], [class*="waiting-room"]',
  WAITING_ROOM_ADMIT_BTN: '[aria-label*="Admit"], button[class*="admit"]',
  WAITING_ROOM_ADMIT_ALL_BTN: '[aria-label*="Admit all"], button[class*="admit-all"]',

  // ── Context menu (right-click on video tile) ──────────────────────────────
  CONTEXT_MENU: '[class*="context-menu"], [role="menu"], [class*="menu-container"]',
  CONTEXT_MENU_ITEM: '[role="menuitem"], [class*="menu-item"]',

  /** Pin / Multipin menu item text patterns (case-insensitive match via contains). */
  PIN_OPTION_TEXT: 'Pin',
  MULTIPIN_OPTION_TEXT: 'Multi-pin',
  UNPIN_OPTION_TEXT: 'Unpin',

  // ── Chat panel ────────────────────────────────────────────────────────────
  CHAT_PANEL: '#chat-panel, [aria-label*="Chat"], [class*="chat-container"]',
  CHAT_MESSAGE: '[class*="chat-message__text"], [class*="chat-item"]',
  CHAT_SENDER: '[class*="chat-message__sender"], [class*="message-sender"]',

  // ── Toolbar / controls ────────────────────────────────────────────────────
  TOOLBAR: '#wc-footer, [class*="footer-toolbar"]',
  LEAVE_BTN: '[aria-label*="Leave"], button[class*="leave-meeting"]',
};

// CommonJS + browser-global dual export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ZoomSelectors;
} else if (typeof window !== 'undefined') {
  window.ZoomSelectors = ZoomSelectors;
}

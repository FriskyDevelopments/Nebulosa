/**
 * Bootstrap gating for host-only automation.
 */

function shouldBootstrapAutomation(capabilities = {}) {
  return capabilities.meetingState === 'in_meeting_ready' && capabilities.hostCapable === true && capabilities.automationArmed === true;
}

const ZoomBootstrapGate = { shouldBootstrapAutomation };

if (typeof module !== 'undefined' && module.exports) {
  module.exports = ZoomBootstrapGate;
} else if (typeof window !== 'undefined') {
  window.ZoomBootstrapGate = ZoomBootstrapGate;
}

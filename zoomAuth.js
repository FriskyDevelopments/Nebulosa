const axios = require('axios');
require('dotenv').config();

// Zoom API base URL
const ZOOM_API_BASE = 'https://api.zoom.us/v2';

// Helper function to get Client ID (use User OAuth Client ID)
function getCleanClientId() {
  return process.env.ZOOM_USER_CLIENT_ID || process.env.ZOOM_CLIENT_ID;
}

function getCleanClientSecret() {
  return process.env.ZOOM_USER_CLIENT_SECRET || process.env.ZOOM_CLIENT_SECRET;
}

// Get access token from authorization code
async function getAccessToken(code) {
  // Fix for 4700 error: Use correct redirect URI from environment
  const redirectUri = process.env.ZOOM_REDIRECT_URI || 'https://nebulosa-production.railway.app/auth/zoom/callback';
  const url = `https://zoom.us/oauth/token?grant_type=authorization_code&code=${code}&redirect_uri=${redirectUri}`;

  const response = await axios.post(url, {}, {
    auth: {
      username: getCleanClientId(),
      password: getCleanClientSecret(),
    },
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  });

  return response.data;
}

// Refresh access token using refresh token
async function refreshAccessToken(refreshToken) {
  const url = `https://zoom.us/oauth/token?grant_type=refresh_token&refresh_token=${refreshToken}`;

  const response = await axios.post(url, {}, {
    auth: {
      username: getCleanClientId(),
      password: getCleanClientSecret(),
    },
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  });

  return response.data;
}

// Make authenticated API request to Zoom
async function makeZoomApiRequest(endpoint, accessToken, method = 'GET', data = null) {
  const config = {
    method,
    url: `${ZOOM_API_BASE}${endpoint}`,
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  };

  if (data && (method === 'POST' || method === 'PATCH' || method === 'PUT')) {
    config.data = data;
  }

  try {
    const response = await axios(config);
    return response.data;
  } catch (error) {
    if (error.response?.status === 401) {
      throw new Error('UNAUTHORIZED');
    }
    throw error;
  }
}

// Get user profile information
async function getUserProfile(accessToken) {
  return await makeZoomApiRequest('/users/me', accessToken);
}

// List user's meetings
async function getUserMeetings(accessToken, type = 'scheduled') {
  return await makeZoomApiRequest(`/users/me/meetings?type=${type}`, accessToken);
}

// Get meeting details
async function getMeetingDetails(accessToken, meetingId) {
  return await makeZoomApiRequest(`/meetings/${meetingId}`, accessToken);
}

// Get meeting participants (for live or past meetings)
async function getMeetingParticipants(accessToken, meetingId, type = 'live') {
  if (type === 'live') {
    return await makeZoomApiRequest(`/meetings/${meetingId}/participants`, accessToken);
  } else {
    return await makeZoomApiRequest(`/report/meetings/${meetingId}/participants`, accessToken);
  }
}

// Get live meeting participant details with video status
async function getLiveMeetingParticipants(accessToken, meetingId) {
  try {
    const response = await makeZoomApiRequest(`/meetings/${meetingId}/participants?include_fields=participant_user_id`, accessToken);
    return response.participants || [];
  } catch (error) {
    console.error('Error getting live participants:', error.message);
    return [];
  }
}

// Start a meeting
async function startMeeting(accessToken, meetingId) {
  return await makeZoomApiRequest(`/meetings/${meetingId}/status`, accessToken, 'PATCH', {
    action: 'start'
  });
}

// End a meeting
async function endMeeting(accessToken, meetingId) {
  return await makeZoomApiRequest(`/meetings/${meetingId}/status`, accessToken, 'PATCH', {
    action: 'end'
  });
}

// Create a new meeting
async function createMeeting(accessToken, meetingData) {
  const defaultMeetingData = {
    topic: 'La NUBE BOT Meeting',
    type: 1, // Instant meeting
    settings: {
      host_video: true,
      participant_video: true,
      join_before_host: false,
      mute_upon_entry: true,
      waiting_room: false,
      audio: 'both',
      auto_recording: 'none'
    }
  };

  const finalMeetingData = { ...defaultMeetingData, ...meetingData };
  return await makeZoomApiRequest('/users/me/meetings', accessToken, 'POST', finalMeetingData);
}

// Get dashboard metrics for meetings
async function getDashboardMetrics(accessToken, from, to) {
  return await makeZoomApiRequest(`/metrics/meetings?from=${from}&to=${to}`, accessToken);
}

// Update meeting settings (closest to multi-pin alternative)
async function updateMeetingSettings(accessToken, meetingId, settings) {
  return await makeZoomApiRequest(`/meetings/${meetingId}`, accessToken, 'PATCH', settings);
}

// Get meeting settings
async function getMeetingSettings(accessToken, meetingId) {
  return await makeZoomApiRequest(`/meetings/${meetingId}`, accessToken);
}

// Create instant meeting with specific settings for better participant control
async function createInstantMeetingWithSettings(accessToken, topic = 'La NUBE BOT Meeting') {
  const meetingData = {
    topic: topic,
    type: 1, // Instant meeting
    duration: 60,
    settings: {
      host_video: true,
      participant_video: true,
      join_before_host: false,
      mute_upon_entry: false,
      waiting_room: false,
      audio: 'both',
      auto_recording: 'none',
      allow_multiple_devices: true,
      approval_type: 0, // Automatically approve
      jbh_time: 0,
      meeting_authentication: false
    }
  };
  
  return await makeZoomApiRequest('/users/me/meetings', accessToken, 'POST', meetingData);
}

// Manage participant privileges (alternative to pinning)
async function updateParticipantStatus(accessToken, meetingId, participantId, action) {
  // Actions: mute, unmute, remove, etc.
  return await makeZoomApiRequest(
    `/meetings/${meetingId}/participants/${participantId}/status`, 
    accessToken, 
    'PATCH', 
    { action }
  );
}

// Send message to Zoom meeting chat
async function sendZoomChatMessage(accessToken, meetingId, message, recipientId = null) {
  const payload = {
    message: message,
    to_contact: recipientId || 'all' // Send to all or specific participant
  };
  
  return await makeZoomApiRequest(
    `/meetings/${meetingId}/events`, 
    accessToken, 
    'PATCH', 
    { action: 'send_message', ...payload }
  );
}

// Send direct message to participant in Zoom
async function sendDirectZoomMessage(accessToken, meetingId, participantId, message) {
  return await makeZoomApiRequest(
    `/meetings/${meetingId}/participants/${participantId}/chat`, 
    accessToken, 
    'POST', 
    { message: message, to_contact: participantId }
  );
}

// Get meeting chat messages (for spam detection)
async function getMeetingChatMessages(accessToken, meetingId, from = null, to = null) {
  let endpoint = `/meetings/${meetingId}/chat`;
  if (from && to) {
    endpoint += `?from=${from}&to=${to}`;
  }
  return await makeZoomApiRequest(endpoint, accessToken);
}

// Move participant to waiting room
async function moveToWaitingRoom(accessToken, meetingId, participantId, reason = 'policy_violation') {
  return await makeZoomApiRequest(
    `/meetings/${meetingId}/participants/${participantId}/status`, 
    accessToken, 
    'PATCH', 
    { 
      action: 'admit',
      participants: [{ id: participantId, admit: false }]
    }
  );
}

// Admit participant from waiting room
async function admitFromWaitingRoom(accessToken, meetingId, participantId) {
  return await makeZoomApiRequest(
    `/meetings/${meetingId}/participants/${participantId}/status`, 
    accessToken, 
    'PATCH', 
    { 
      action: 'admit',
      participants: [{ id: participantId, admit: true }]
    }
  );
}

// Promote participant to cohost
async function promoteToCohost(accessToken, meetingId, participantId) {
  return await makeZoomApiRequest(
    `/meetings/${meetingId}/participants/${participantId}/status`, 
    accessToken, 
    'PATCH', 
    { action: 'assign_cohost' }
  );
}

module.exports = {
  getAccessToken,
  refreshAccessToken,
  makeZoomApiRequest,
  getUserProfile,
  getUserMeetings,
  getMeetingDetails,
  getMeetingParticipants,
  getLiveMeetingParticipants,
  startMeeting,
  endMeeting,
  createMeeting,
  createInstantMeetingWithSettings,
  updateMeetingSettings,
  getMeetingSettings,
  updateParticipantStatus,
  sendZoomChatMessage,
  sendDirectZoomMessage,
  getMeetingChatMessages,
  moveToWaitingRoom,
  admitFromWaitingRoom,
  promoteToCohost,
  getDashboardMetrics
};

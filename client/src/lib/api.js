// In dev, the client (Vite, :5173) and server (:4000) run on different ports,
// so we need an absolute URL — set via VITE_API_URL in client/.env.
// In production the client is served by the same Express app as the API,
// so a relative '' base works (requests just go to the current origin).
const API_BASE = import.meta.env.VITE_API_URL || '';

function getToken() {
  return localStorage.getItem('gym_buddy_token');
}

export function setToken(token) {
  if (token) localStorage.setItem('gym_buddy_token', token);
  else localStorage.removeItem('gym_buddy_token');
}

async function request(path, { method = 'GET', body, auth = true } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (auth) {
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  });

  let data = null;
  try {
    data = await res.json();
  } catch {
    // no JSON body
  }

  if (!res.ok) {
    const message = data?.error || `Request failed (${res.status})`;
    throw new Error(message);
  }

  return data;
}

export const api = {
  signup: (payload) => request('/api/auth/signup', { method: 'POST', body: payload, auth: false }),
  login: (payload) => request('/api/auth/login', { method: 'POST', body: payload, auth: false }),
  me: () => request('/api/auth/me'),
  updateProfile: (payload) => request('/api/auth/profile', { method: 'PUT', body: payload }),
  deleteAccount: () => request('/api/auth/account', { method: 'DELETE' }),
  completeOnboarding: (payload) => request('/api/auth/onboarding', { method: 'PUT', body: payload }),

  getMySchedule: () => request('/api/schedule/me'),
  saveMySchedule: (slots) => request('/api/schedule/me', { method: 'PUT', body: { slots } }),
  getOverlap: () => request('/api/schedule/overlap'),
  checkIn: (status_tag) => request('/api/schedule/checkin', { method: 'POST', body: { status_tag } }),
  checkOut: () => request('/api/schedule/checkout', { method: 'POST' }),
  getLive: () => request('/api/schedule/live'),
  getMyStatus: () => request('/api/schedule/my-status'),
  getLeaderboard: () => request('/api/schedule/leaderboard'),

  sendBuddyRequest: (to_user_id) => request('/api/buddies/request', { method: 'POST', body: { to_user_id } }),
  respondToRequest: (requestId, action) => request(`/api/buddies/${requestId}/respond`, { method: 'POST', body: { action } }),
  getIncoming: () => request('/api/buddies/incoming'),
  getOutgoing: () => request('/api/buddies/outgoing'),
  getConnections: () => request('/api/buddies/connections'),

  getConversations: () => request('/api/messages'),
  getMessages: (userId) => request(`/api/messages/${userId}`),
  sendMessage: (userId, body) => request(`/api/messages/${userId}`, { method: 'POST', body: { body } }),

  blockUser: (userId) => request('/api/moderation/block', { method: 'POST', body: { userId } }),
  unblockUser: (userId) => request(`/api/moderation/block/${userId}`, { method: 'DELETE' }),
  getBlocked: () => request('/api/moderation/blocked'),
  reportUser: (userId, reason) => request('/api/moderation/report', { method: 'POST', body: { userId, reason } })
};

export { getToken, API_BASE };

import { getAccessToken } from './authApi';
import { buildApiUrl } from './apiConfig';

function parseDetail(detail) {
  if (!detail) return 'Yêu cầu thất bại';
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) {
    return detail
      .map((e) => {
        if (typeof e !== 'object' || e === null) return String(e);
        const loc = Array.isArray(e.loc) ? e.loc.filter((x) => x !== 'body').join(' › ') : '';
        const msg = e.msg || e.message || e.type || JSON.stringify(e);
        return loc ? `${loc}: ${msg}` : msg;
      })
      .join('; ');
  }
  return String(detail);
}

async function adminRequest(path, options = {}) {
  const token = getAccessToken();
  if (!token) throw new Error('Bạn cần đăng nhập với tài khoản admin.');

  const headers = {
    Authorization: `Bearer ${token}`,
    ...(options.headers || {}),
  };
  if (options.body && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  let response;
  try {
    response = await fetch(buildApiUrl(path), { ...options, headers });
  } catch {
    throw new Error('Không thể kết nối đến server.');
  }

  if (response.status === 204) return null;

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(parseDetail(data.detail));
  }
  return data;
}

function buildQuery(params = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') query.set(k, String(v));
  });
  const qs = query.toString();
  return qs ? `?${qs}` : '';
}

// ----- Stats -----
export function fetchAdminStats() {
  return adminRequest('/trohub/admin/stats');
}

// ----- Landlord applications -----
export function fetchLandlordProfiles({ state = 'pending', keyword = '', skip = 0, limit = 50 } = {}) {
  return adminRequest(
    `/trohub/admin/landlord-profiles${buildQuery({ state, keyword, skip, limit })}`,
  );
}

export function fetchLandlordCounts() {
  return adminRequest('/trohub/admin/landlord-profiles/counts');
}

export function fetchLandlordProfile(userId) {
  return adminRequest(`/trohub/admin/landlord-profiles/${userId}`);
}

export function approveLandlord(userId) {
  return adminRequest(`/trohub/admin/landlord-profiles/${userId}/approve`, { method: 'PATCH' });
}

export function rejectLandlord(userId, reason = '') {
  const body = reason ? JSON.stringify({ reason }) : undefined;
  return adminRequest(`/trohub/admin/landlord-profiles/${userId}/reject`, {
    method: 'PATCH',
    body,
  });
}

// ----- Users -----
export function fetchAdminUsers(params = {}) {
  return adminRequest(`/trohub/admin/users${buildQuery(params)}`);
}

export function updateUserStatus(userId, newStatus) {
  return adminRequest(`/trohub/admin/users/${userId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status: newStatus }),
  });
}

export function deleteUser(userId) {
  return adminRequest(`/trohub/admin/users/${userId}`, { method: 'DELETE' });
}

// ----- Rooms -----
export function fetchAdminRooms(params = {}) {
  return adminRequest(`/trohub/admin/rooms${buildQuery(params)}`);
}

export function updateRoomStatus(roomId, newStatus) {
  return adminRequest(`/trohub/admin/rooms/${roomId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status: newStatus }),
  });
}

export function deleteRoom(roomId) {
  return adminRequest(`/trohub/admin/rooms/${roomId}`, { method: 'DELETE' });
}

// ----- Reports -----
export function fetchAdminReports(params = {}) {
  return adminRequest(`/trohub/admin/reports${buildQuery(params)}`);
}

export function updateReportStatus(reportId, newStatus) {
  return adminRequest(`/trohub/admin/reports/${reportId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status: newStatus }),
  });
}

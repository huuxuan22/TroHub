import { getAccessToken } from './authApi';

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_BASE || 'http://127.0.0.1:8000';

function parseDetail(detail) {
  if (!detail) return 'Request failed';
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

function authHeadersJSON() {
  const token = getAccessToken();
  if (!token) throw new Error('Sign in to use favorites.');
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
}

function authHeadersBearer() {
  const token = getAccessToken();
  if (!token) throw new Error('Sign in to use favorites.');
  return { Authorization: `Bearer ${token}` };
}

/** @returns {Promise<number[]>} */
export async function fetchFavoriteRoomIds() {
  let response;
  try {
    response = await fetch(`${API_BASE_URL}/trohub/favorites/me/room-ids`, {
      headers: authHeadersJSON(),
    });
  } catch {
    throw new Error('Cannot reach server.');
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(parseDetail(data.detail));
  }
  return Array.isArray(data.room_ids) ? data.room_ids.map(Number) : [];
}

export async function addFavoriteRoom(roomId) {
  let response;
  try {
    response = await fetch(`${API_BASE_URL}/trohub/favorites/me`, {
      method: 'POST',
      headers: authHeadersJSON(),
      body: JSON.stringify({ room_id: Number(roomId) }),
    });
  } catch {
    throw new Error('Cannot reach server.');
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(parseDetail(data.detail));
  }
  return data;
}

export async function removeFavoriteRoom(roomId) {
  let response;
  try {
    response = await fetch(`${API_BASE_URL}/trohub/favorites/me/by-room/${Number(roomId)}`, {
      method: 'DELETE',
      headers: authHeadersBearer(),
    });
  } catch {
    throw new Error('Cannot reach server.');
  }
  if (response.status === 204) return true;
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(parseDetail(data.detail));
  }
  return true;
}

/** @returns {Promise<object[]>} raw rows with nested `room` */
export async function fetchMyFavoritesRaw() {
  let response;
  try {
    response = await fetch(`${API_BASE_URL}/trohub/favorites/me?limit=100`, {
      headers: authHeadersJSON(),
    });
  } catch {
    throw new Error('Cannot reach server.');
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(parseDetail(data.detail));
  }
  return Array.isArray(data) ? data : [];
}

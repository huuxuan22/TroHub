const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_BASE || 'http://127.0.0.1:8000';
const TOKEN_KEY = 'trohub_access_token';
const USER_KEY = 'trohub_user';

export function getAccessToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setAuthSession(token, user) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearAuthSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function getStoredUser() {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function parseDetail(detail) {
  if (!detail) return 'Yêu cầu thất bại';
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) {
    return detail.map((e) => (typeof e === 'object' ? (e.msg || JSON.stringify(e)) : String(e))).join('; ');
  }
  return String(detail);
}

async function request(path, options = {}) {
  let response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, options);
  } catch {
    throw new Error('Không thể kết nối đến server. Vui lòng kiểm tra kết nối mạng.');
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(parseDetail(data.detail));
  }
  return data;
}

export async function login(email, password) {
  const tokenData = await request('/trohub/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  const user = await request('/trohub/auth/me', {
    headers: { Authorization: `Bearer ${tokenData.access_token}` },
  });

  setAuthSession(tokenData.access_token, user);
  return user;
}

export async function register(payload) {
  await request('/trohub/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export async function fetchMe() {
  const token = getAccessToken();
  if (!token) return null;
  try {
    const user = await request('/trohub/auth/me', {
      headers: { Authorization: `Bearer ${token}` },
    });
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    return user;
  } catch {
    clearAuthSession();
    return null;
  }
}

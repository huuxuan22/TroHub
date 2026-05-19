import { buildApiUrl } from './apiConfig';

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
    return detail
      .map((e) => {
        if (typeof e !== 'object' || e === null) return String(e);
        const loc = Array.isArray(e.loc) ? e.loc.filter((x) => x !== 'body').join(' › ') : '';
        const msg = e.msg || e.message || e.type || JSON.stringify(e);
        return loc ? `${loc}: ${msg}` : msg;
      })
      .join('; ');
  }
  if (typeof detail === 'object') {
    return JSON.stringify(detail);
  }
  return String(detail);
}

async function request(path, options = {}) {
  let response;
  try {
    response = await fetch(buildApiUrl(path), options);
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

export async function requestRegistrationCode(payload) {
  await request('/trohub/auth/register/send-code', {
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

/** Lưu địa chỉ vị trí người dùng (yêu cầu đã đăng nhập). */
export async function saveUserLocationAddress(address) {
  const token = getAccessToken();
  if (!token) return null;
  const user = await request('/trohub/auth/me/location', {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ address }),
  });
  localStorage.setItem(USER_KEY, JSON.stringify(user));
  return user;
}

/** Gọi server (nếu còn token) rồi luôn xóa token/user local — không ném lỗi ra ngoài. */
export async function logoutSession() {
  const token = getAccessToken();
  if (token) {
    try {
      await fetch(buildApiUrl('/trohub/auth/logout'), {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch {
      // Mất mạng vẫn đăng xuất phía client
    }
  }
  clearAuthSession();
}

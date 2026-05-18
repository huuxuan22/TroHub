import { getAccessToken } from './authApi';
import { buildApiUrl, buildWsUrl } from './apiConfig';

function parseDetail(detail) {
  if (!detail) return 'Yeu cau that bai';
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) {
    return detail
      .map((e) => {
        if (typeof e !== 'object' || e === null) return String(e);
        const loc = Array.isArray(e.loc) ? e.loc.filter((x) => x !== 'body').join(' > ') : '';
        const msg = e.msg || e.message || e.type || JSON.stringify(e);
        return loc ? `${loc}: ${msg}` : msg;
      })
      .join('; ');
  }
  return String(detail);
}

function buildAuthHeaders() {
  const token = getAccessToken();
  if (!token) throw new Error('Ban can dang nhap de nhan tin.');
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
}

async function request(path, options = {}) {
  let response;
  try {
    response = await fetch(buildApiUrl(path), options);
  } catch {
    throw new Error('Khong the ket noi den server.');
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(parseDetail(data?.detail) || `HTTP ${response.status}`);
  }
  return data;
}

export async function fetchThreadMessages({ otherUserId, roomId, limit = 100 }) {
  const query = new URLSearchParams();
  query.set('other_user_id', String(otherUserId));
  query.set('limit', String(limit));
  if (roomId != null) query.set('room_id', String(roomId));

  return request(`/trohub/messages/thread?${query.toString()}`, {
    headers: { Authorization: buildAuthHeaders().Authorization },
  });
}

export async function fetchConversations(limit = 20) {
  return request(`/trohub/messages/conversations?limit=${limit}`, {
    headers: { Authorization: buildAuthHeaders().Authorization },
  });
}

export async function createConversation({ userId, otherUserId, roomId }) {
  return request('/trohub/messages/conversations', {
    method: 'POST',
    headers: buildAuthHeaders(),
    body: JSON.stringify({
      user_id: userId,
      other_user_id: otherUserId,
      room_id: roomId,
    }),
  });
}

export async function sendMessage({ receiverId, roomId, content }) {
  return request('/trohub/messages', {
    method: 'POST',
    headers: buildAuthHeaders(),
    body: JSON.stringify({
      receiver_id: receiverId,
      room_id: roomId ?? null,
      content,
    }),
  });
}

export async function markThreadAsRead({ otherUserId, roomId }) {
  return request('/trohub/messages/thread/read', {
    method: 'POST',
    headers: buildAuthHeaders(),
    body: JSON.stringify({
      other_user_id: otherUserId,
      room_id: roomId ?? null,
    }),
  });
}

export async function fetchSupportAdmin() {
  return request('/trohub/users/support-admin', {
    headers: buildAuthHeaders(),
  });
}

export function createChatSocket({ roomId, senderId, onMessage, onError, onOpen, onClose }) {
  const token = getAccessToken();
  if (!token) return null;

  const wsUrl = buildWsUrl(`/trohub/ws/chat/${roomId}`);
  wsUrl.searchParams.set('sender_id', String(senderId));
  wsUrl.searchParams.set('token', token);

  const socket = new WebSocket(wsUrl.toString());
  if (onOpen) socket.addEventListener('open', onOpen);
  if (onClose) socket.addEventListener('close', onClose);
  if (onError) socket.addEventListener('error', onError);
  socket.addEventListener('message', (event) => {
    try {
      const data = JSON.parse(event.data);
      if (onMessage) onMessage(data);
    } catch {
      if (onError) onError(new Error('Invalid websocket payload'));
    }
  });

  return socket;
}

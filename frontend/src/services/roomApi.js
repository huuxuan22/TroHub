import { getAccessToken } from './authApi';
import { formatDistanceKm } from '../utils/useGeolocation';
import { mapAmenityHighlights } from '../utils/amenityDisplay';
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

function inferCityFromAddress(address = '') {
  const parts = sanitizeAddress(address).split(',').map((item) => item.trim()).filter(Boolean);
  return parts.length ? parts[parts.length - 1] : '';
}

/** Chuẩn hóa đoạn địa chỉ (trim + gộp khoảng trắng, không đổi dấu tiếng Việt). */
function normalizeAddressSegment(s) {
  const normalized = String(s).replace(/\s+/g, ' ').trim().toLowerCase();
  return normalized.replace(/^(thành phố|tp\.?)\s+/i, '');
}

/**
 * Làm gọn địa chỉ:
 * - bỏ khoảng trắng/dấu phẩy thừa
 * - khử đoạn lặp theo cụm (vd: "Đà Nẵng, Đà Nẵng")
 */
function sanitizeAddress(address = '') {
  const parts = String(address)
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean);
  if (!parts.length) return '';

  const deduped = [];
  parts.forEach((part) => {
    const currentNorm = normalizeAddressSegment(part);
    const prevNorm = normalizeAddressSegment(deduped[deduped.length - 1] || '');
    if (currentNorm && currentNorm === prevNorm) return;
    deduped.push(part);
  });

  return deduped.join(', ');
}

function dedupeAddressSegments(address = '') {
  const parts = String(address)
    .trim()
    .replace(/,\s*$/, '')
    .split(',')
    .map((part) => part.trim().replace(/\s+/g, ' '))
    .filter(Boolean);

  const deduped = [];
  parts.forEach((part) => {
    const previous = deduped[deduped.length - 1];
    if (previous && normalizeAddressSegment(previous) === normalizeAddressSegment(part)) {
      return;
    }
    deduped.push(part);
  });

  return deduped.join(', ');
}

/**
 * Hiển thị / lưu một dòng địa chỉ kèm thành phố mà không lặp (vd: địa chỉ đã kết thúc bằng "Đà Nẵng" thì không thêm ", Đà Nẵng").
 */
export function formatAddressWithCity(address = '', city = '') {
  const addr = dedupeAddressSegments(address);
  const cty = String(city).trim();
  if (!cty) return addr;
  if (!addr) return cty;
  const parts = addr.split(',').map((p) => p.trim()).filter(Boolean);
  const lastNorm = normalizeAddressSegment(parts[parts.length - 1] || '');
  if (lastNorm === normalizeAddressSegment(cty)) return addr;
  return `${addr}, ${cty}`;
}

const DEFAULT_MAP_CENTER = [10.8231, 106.6297]; // TP.HCM

function isValidCoordinate(lat, lng) {
  return Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;
}

export function mapRoomFromApi(room) {
  const createdAt = room.created_at || new Date().toISOString();
  const createdDate = new Date(createdAt);
  const now = new Date();
  const isNew = Math.floor((now - createdDate) / (1000 * 60 * 60 * 24)) <= 3;

  const latRaw = room.latitude != null ? Number(room.latitude) : null;
  const lngRaw = room.longitude != null ? Number(room.longitude) : null;
  const hasExactLocation = isValidCoordinate(latRaw, lngRaw);
  const normalizedType = room.room_type || (room.source === 'owner' ? 'Phòng trọ' : 'Nhà nguyên căn');
  const imageUrls = Array.isArray(room.images)
    ? room.images.map((img) => (typeof img === 'string' ? img : img?.image_url)).filter(Boolean)
    : [];

  return {
    id: room.id,
    title: room.title,
    price: Number(room.price || 0),
    area: Number(room.area_sqm || 0),
    address: dedupeAddressSegments(room.address || ''),
    latitude: hasExactLocation ? latRaw : null,
    longitude: hasExactLocation ? lngRaw : null,
    city: inferCityFromAddress(room.address || ''),
    type: normalizedType,
    images: imageUrls,
    amenities: [],
    isVerified: room.status === 'available',
    isFeatured: room.status === 'available',
    isNew,
    rating: 4.5,
    reviewCount: 0,
    postedAt: createdAt,
    landlordId: room.landlord_id || null,
    source: room.source || 'owner',
    isCrawled: (room.source || '').toLowerCase() === 'crawl',
    landlord: { name: `Chủ trọ #${room.landlord_id || 'N/A'}`, phone: 'Đang cập nhật', avatar: null },
    description: room.description || 'Chưa có mô tả',
    aiScore: null,
    aiHighlight: null,
    hasExactLocation,
  };
}

export function hasExactCoordinates(room) {
  return isValidCoordinate(room?.latitude, room?.longitude);
}

export function getRoomLatLng(room) {
  if (!hasExactCoordinates(room)) return null;
  return [room.latitude, room.longitude];
}

export { DEFAULT_MAP_CENTER };

export async function fetchRooms(params = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      query.set(key, String(value));
    }
  });

  const response = await fetch(buildApiUrl(`/trohub/rooms?${query.toString()}`));
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const data = await response.json();
  const rooms = data.map(mapRoomFromApi);
  const totalHeader = response.headers.get('X-Total-Count');
  const total = totalHeader != null && totalHeader !== '' ? Number(totalHeader) : rooms.length;
  return { rooms, total: Number.isFinite(total) ? total : rooms.length, isMock: false };
}

export async function fetchRoomDetail(roomId) {
  const response = await fetch(buildApiUrl(`/trohub/rooms/${roomId}`));
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const data = await response.json();
  return { room: mapRoomFromApi(data), isMock: false };
}

/** Liên hệ chủ phòng: crawl → SĐT gốc; tài khoản thật → SĐT/email + chat. */
export async function fetchRoomContact(roomId) {
  const response = await fetch(buildApiUrl(`/trohub/rooms/${roomId}/contact`));
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const data = await response.json();
  return {
    isCrawled: Boolean(data.is_crawled),
    phone: data.phone?.trim() || null,
    email: data.email?.trim() || null,
    landlordId: data.landlord_id ?? null,
  };
}

/** Chủ trọ thật yêu cầu nhận quyền tin crawl (admin duyệt sau). */
export async function claimRoomOwnership(roomId, { phoneNumber, evidence } = {}) {
  const token = getAccessToken();
  if (!token) throw new Error('Bạn cần đăng nhập với tài khoản chủ trọ.');
  const response = await fetch(buildApiUrl(`/trohub/rooms/${roomId}/claim`), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      phone_number: phoneNumber,
      evidence: evidence || null,
    }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(parseDetail(data?.detail) || `HTTP ${response.status}`);
  }
  return data;
}

/** 10 phòng nổi bật — modal ưu đãi sau đăng nhập. */
export async function fetchFeaturedHotRooms(limit = 10) {
  const query = new URLSearchParams({ limit: String(limit) });
  let response;
  try {
    response = await fetch(buildApiUrl(`/trohub/rooms/featured-hot?${query.toString()}`));
  } catch {
    return [];
  }
  if (!response.ok) return [];

  const data = await response.json();
  if (!Array.isArray(data)) return [];

  return data.map((row) => {
    const room = mapRoomFromApi(row);
    return {
      ...room,
      amenityHighlights: mapAmenityHighlights(row.amenities, 3),
    };
  });
}

/** Phòng crawl mới gần `users.address` — modal sau đăng nhập. */
export async function fetchNearbyCrawlNewRooms(limit = 30) {
  const token = getAccessToken();
  if (!token) return [];

  const query = new URLSearchParams({ limit: String(limit) });
  let response;
  try {
    response = await fetch(buildApiUrl(`/trohub/rooms/nearby-crawl-new?${query.toString()}`), {
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch {
    return [];
  }
  if (!response.ok) return [];

  const data = await response.json();
  if (!Array.isArray(data)) return [];

  return data.map((row) => {
    const room = mapRoomFromApi(row);
    const km = row.distance_km != null ? Number(row.distance_km) : null;
    return {
      ...room,
      distanceLabel: Number.isFinite(km) ? formatDistanceKm(km) : '',
    };
  });
}

/**
 * Upload một ảnh phòng lên MinIO qua backend, trả về URL công khai.
 */
export async function uploadRoomImage(file) {
  if (!file) throw new Error('Thiếu file ảnh');
  const formData = new FormData();
  formData.append('file', file);

  const token = getAccessToken();
  const headers = token ? { Authorization: `Bearer ${token}` } : {};

  let response;
  try {
    response = await fetch(buildApiUrl('/trohub/uploads/image'), {
      method: 'POST',
      headers,
      body: formData,
    });
  } catch {
    throw new Error('Không thể kết nối đến server upload.');
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(parseDetail(data.detail) || 'Upload ảnh thất bại');
  }
  return data.url;
}

/**
 * Tạo tin đăng phòng mới. Yêu cầu token + tài khoản chủ nhà đã xác minh (hoặc admin).
 */
export async function createRoom(payload) {
  const token = getAccessToken();
  if (!token) throw new Error('Bạn cần đăng nhập để đăng tin.');

  let response;
  try {
    response = await fetch(buildApiUrl('/trohub/rooms'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });
  } catch {
    throw new Error('Không thể kết nối đến server.');
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(parseDetail(data.detail) || `HTTP ${response.status}`);
  }
  return data;
}

function buildAuthHeaders() {
  const token = getAccessToken();
  if (!token) throw new Error('Bạn cần đăng nhập để thực hiện thao tác này.');
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

/**
 * Lấy danh sách phòng của chủ trọ hiện tại (giữ nguyên format từ backend
 * để có id ảnh, status, expires_at... phục vụ trang quản lý).
 */
export async function fetchMyRooms({ landlordId, status, keyword } = {}) {
  if (!landlordId) throw new Error('Thiếu landlord_id');
  const query = new URLSearchParams();
  query.set('landlord_id', String(landlordId));
  query.set('limit', '100');
  if (status) query.set('status', status);
  if (keyword) query.set('keyword', keyword);

  const token = getAccessToken();
  const headers = token ? { Authorization: `Bearer ${token}` } : {};

  const response = await fetch(buildApiUrl(`/trohub/rooms?${query.toString()}`), { headers });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(parseDetail(data?.detail) || `HTTP ${response.status}`);
  }
  return Array.isArray(data) ? data : [];
}

/**
 * Cập nhật một phòng. Payload là partial — chỉ gửi field cần đổi.
 */
export async function updateRoom(roomId, payload) {
  const response = await fetch(buildApiUrl(`/trohub/rooms/${roomId}`), {
    method: 'PUT',
    headers: buildAuthHeaders(),
    body: JSON.stringify(payload),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(parseDetail(data?.detail) || `HTTP ${response.status}`);
  }
  return data;
}

export async function deleteRoom(roomId) {
  const response = await fetch(buildApiUrl(`/trohub/rooms/${roomId}`), {
    method: 'DELETE',
    headers: buildAuthHeaders(),
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(parseDetail(data?.detail) || `HTTP ${response.status}`);
  }
  return true;
}

export async function addRoomImage(roomId, imageUrl) {
  const response = await fetch(buildApiUrl(`/trohub/rooms/${roomId}/images`), {
    method: 'POST',
    headers: buildAuthHeaders(),
    body: JSON.stringify({ image_url: imageUrl }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(parseDetail(data?.detail) || `HTTP ${response.status}`);
  }
  return data;
}

export async function deleteRoomImage(roomId, imageId) {
  const response = await fetch(buildApiUrl(`/trohub/rooms/${roomId}/images/${imageId}`), {
    method: 'DELETE',
    headers: buildAuthHeaders(),
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(parseDetail(data?.detail) || `HTTP ${response.status}`);
  }
  return true;
}

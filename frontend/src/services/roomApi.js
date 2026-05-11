const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_BASE || 'http://127.0.0.1:8000';

function inferCityFromAddress(address = '') {
  const parts = address.split(',').map((item) => item.trim()).filter(Boolean);
  return parts.length ? parts[parts.length - 1] : '';
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

  return {
    id: room.id,
    title: room.title,
    price: Number(room.price || 0),
    area: Number(room.area_sqm || 0),
    address: room.address || '',
    latitude: hasExactLocation ? latRaw : null,
    longitude: hasExactLocation ? lngRaw : null,
    city: inferCityFromAddress(room.address),
    type: normalizedType,
    images: [],
    amenities: [],
    isVerified: room.status === 'available',
    isFeatured: room.status === 'available',
    isNew,
    rating: 4.5,
    reviewCount: 0,
    postedAt: createdAt,
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

  const response = await fetch(`${API_BASE_URL}/trohub/rooms?${query.toString()}`);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const data = await response.json();
  return { rooms: data.map(mapRoomFromApi), isMock: false };
}

export async function fetchRoomDetail(roomId) {
  const response = await fetch(`${API_BASE_URL}/trohub/rooms/${roomId}`);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const data = await response.json();
  return { room: mapRoomFromApi(data), isMock: false };
}

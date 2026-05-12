const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_BASE || 'http://127.0.0.1:8000';

function parseDetail(detail) {
  if (!detail) return 'Tra cứu thất bại';
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) {
    return detail.map((e) => (typeof e === 'object' ? e.msg || JSON.stringify(e) : String(e))).join('; ');
  }
  return String(detail);
}

/**
 * Reverse geocoding qua backend: lat/lng → địa chỉ + (city, district).
 * Trả về null nếu không tìm được (giúp UI tự fallback chấp nhận toạ độ thô).
 */
export async function reverseGeocode(latitude, longitude) {
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    throw new Error('Toạ độ không hợp lệ');
  }
  const params = new URLSearchParams({ lat: String(latitude), lng: String(longitude) });

  let response;
  try {
    response = await fetch(`${API_BASE_URL}/trohub/geocoding/reverse?${params.toString()}`);
  } catch {
    throw new Error('Không thể kết nối đến server.');
  }

  if (response.status === 404) {
    return null;
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(parseDetail(data.detail));
  }
  return data;
}

import { useCallback, useState } from 'react';

const PERMISSION_HINTS = {
  1: 'Bạn đã từ chối quyền truy cập vị trí. Hãy mở lại trong cài đặt trình duyệt rồi thử lại.',
  2: 'Không lấy được vị trí (có thể đang offline hoặc thiết bị không hỗ trợ GPS).',
  3: 'Lấy vị trí quá lâu, vui lòng thử lại.',
};

/**
 * Hook bọc Geolocation API của trình duyệt.
 *
 * Trả về:
 *   - position: { latitude, longitude, accuracy } | null
 *   - error: string | null
 *   - loading: boolean
 *   - requestLocation(): Promise<{latitude, longitude, accuracy}>
 *   - reset()
 *
 * Lưu ý: Chrome / Safari yêu cầu HTTPS hoặc localhost mới cho phép geolocation.
 */
export default function useGeolocation(options = {}) {
  const [position, setPosition] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const {
    enableHighAccuracy = true,
    timeout = 12000,
    maximumAge = 60000,
  } = options;

  const requestLocation = useCallback(() => {
    return new Promise((resolve, reject) => {
      setError(null);

      if (typeof navigator === 'undefined' || !navigator.geolocation) {
        const msg = 'Trình duyệt không hỗ trợ định vị (Geolocation API).';
        setError(msg);
        reject(new Error(msg));
        return;
      }

      setLoading(true);
      navigator.geolocation.getCurrentPosition(
        (geo) => {
          const data = {
            latitude: geo.coords.latitude,
            longitude: geo.coords.longitude,
            accuracy: geo.coords.accuracy,
          };
          setPosition(data);
          setLoading(false);
          resolve(data);
        },
        (err) => {
          const msg = PERMISSION_HINTS[err.code] || err.message || 'Không lấy được vị trí.';
          setError(msg);
          setLoading(false);
          reject(new Error(msg));
        },
        { enableHighAccuracy, timeout, maximumAge },
      );
    });
  }, [enableHighAccuracy, timeout, maximumAge]);

  const reset = useCallback(() => {
    setPosition(null);
    setError(null);
    setLoading(false);
  }, []);

  return { position, error, loading, requestLocation, reset };
}

/**
 * Tính khoảng cách giữa 2 điểm trên Trái Đất theo công thức Haversine.
 * @returns khoảng cách tính bằng km.
 */
export function haversineDistanceKm(lat1, lng1, lat2, lng2) {
  if (
    !Number.isFinite(lat1) || !Number.isFinite(lng1) ||
    !Number.isFinite(lat2) || !Number.isFinite(lng2)
  ) {
    return Infinity;
  }
  const toRad = (deg) => (deg * Math.PI) / 180;
  const R = 6371; // bán kính Trái Đất (km)
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function formatDistanceKm(km) {
  if (!Number.isFinite(km)) return '';
  if (km < 1) return `${Math.round(km * 1000)} m`;
  if (km < 10) return `${km.toFixed(1)} km`;
  return `${Math.round(km)} km`;
}

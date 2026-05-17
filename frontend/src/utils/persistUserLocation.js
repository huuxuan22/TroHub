import { getAccessToken, saveUserLocationAddress } from '../services/authApi';
import { reverseGeocode } from '../services/geocodingApi';

/**
 * Nếu đã đăng nhập: reverse geocode lat/lng → lưu địa chỉ vào users.address.
 * Khách (chưa đăng nhập): không gọi API, UI giữ hành vi cũ.
 */
export async function persistUserLocationIfAuthenticated(position, { refreshUser } = {}) {
  if (!getAccessToken() || !position) return;

  try {
    const geo = await reverseGeocode(position.latitude, position.longitude);
    const address = geo?.address?.trim();
    if (!address) return;

    await saveUserLocationAddress(address);
    if (typeof refreshUser === 'function') {
      await refreshUser();
    }
  } catch {
    // Không chặn luồng lấy vị trí trên bản đồ nếu lưu DB thất bại
  }
}

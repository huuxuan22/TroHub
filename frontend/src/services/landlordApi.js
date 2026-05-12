import { getAccessToken } from './authApi';

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_BASE || 'http://127.0.0.1:8000';

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

export async function submitLandlordApplication({ business_name, national_id, business_license }) {
  const token = getAccessToken();
  if (!token) throw new Error('Bạn cần đăng nhập.');

  const response = await fetch(`${API_BASE_URL}/trohub/landlord/apply`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      business_name,
      national_id,
      business_license: business_license || null,
    }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(parseDetail(data.detail));
  }
  return data;
}

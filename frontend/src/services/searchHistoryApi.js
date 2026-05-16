import { getAccessToken } from './authApi';

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_BASE || 'http://127.0.0.1:8000';

/**
 * Ghi nhận lần tìm kiếm vào DB (không chặn UI nếu lỗi).
 * @param {{ keyword?: string, city?: string, filters?: object, result_count?: number }} payload
 */
export async function recordSearchHistory(payload) {
  const token = getAccessToken();
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;

  const body = {
    keyword: payload?.keyword?.trim() || null,
    city: payload?.city?.trim() || null,
    filters: payload?.filters ?? null,
    result_count: payload?.result_count ?? null,
  };

  const hasContent =
    Boolean(body.keyword?.trim()) ||
    Boolean(body.city?.trim()) ||
    (body.filters && Object.keys(body.filters).length > 0);
  if (!hasContent) return;

  try {
    const response = await fetch(`${API_BASE_URL}/trohub/search-history`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      // Không làm gián đoạn trải nghiệm tìm kiếm
      return;
    }
    return response.json();
  } catch {
    return null;
  }
}

/**
 * Chuẩn hoá & so khớp từ khoá tìm kiếm (đồng bộ với backend rooms_service._normalize_search_text).
 * Ví dụ: "31 mẹ nhu" khớp địa chỉ "31, Mẹ Nhu, phường …" — không cần gõ dấu phẩy.
 */
export function normalizeSearchText(value) {
  let text = String(value ?? '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D');
  text = text.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  text = text.replace(/[^0-9a-zA-Z]+/g, ' ').toLowerCase();
  return text.replace(/\s+/g, ' ').trim();
}

/** @param {string} haystack */
/** @param {string} keyword */
export function textMatchesKeyword(haystack, keyword) {
  const needle = normalizeSearchText(keyword);
  if (!needle) return true;
  const stack = normalizeSearchText(haystack);
  if (!stack) return false;
  if (stack.includes(needle)) return true;
  const tokens = needle.split(' ').filter(Boolean);
  return tokens.length > 0 && tokens.every((token) => stack.includes(token));
}

/** @param {{ title?: string, address?: string, city?: string, type?: string, description?: string }} room */
export function roomMatchesLocationQuery(room, query) {
  const parts = [room.title, room.address, room.city, room.type, room.description].filter(Boolean);
  return textMatchesKeyword(parts.join(' '), query);
}

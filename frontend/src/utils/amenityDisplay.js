const ICON_RULES = [
  { test: /wifi|mạng/i, icon: '📡' },
  { test: /điều hòa|máy lạnh|ac/i, icon: '🌬️' },
  { test: /xe|để xe|parking|gửi xe/i, icon: '🛵' },
  { test: /giặt/i, icon: '🧺' },
  { test: /an ninh|bảo vệ|security/i, icon: '🛡️' },
  { test: /bếp|nấu/i, icon: '🍽️' },
  { test: /ban công|balcony/i, icon: '🌇' },
  { test: /thang máy|elevator/i, icon: '🛗' },
  { test: /nội thất|giường|tủ/i, icon: '🛋️' },
  { test: /nước nóng|sưởi/i, icon: '🚿' },
];

export function amenityIconForName(name = '') {
  const label = String(name).trim();
  for (const rule of ICON_RULES) {
    if (rule.test.test(label)) return rule.icon;
  }
  return '✨';
}

export function mapAmenityHighlights(rawList, max = 3) {
  if (!Array.isArray(rawList)) return [];
  return rawList
    .slice(0, max)
    .map((item, idx) => {
      const label = typeof item === 'string' ? item : (item?.name || item?.label || '');
      const id = typeof item === 'object' && item?.id != null ? String(item.id) : `a-${idx}`;
      return { id, label: String(label).trim(), icon: amenityIconForName(label) };
    })
    .filter((a) => a.label);
}

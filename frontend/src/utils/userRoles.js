export function isAdminUser(user) {
  return String(user?.role ?? '').toLowerCase() === 'admin';
}

/** Admin hoặc chủ nhà đã admin duyệt (role landlord + landlord_profiles.is_verified = 1) — mới được đăng tin / quản lý tin. */
export function canPostRoom(user) {
  if (!user?.role) return false;
  const role = String(user.role).toLowerCase();
  if (role === 'admin') return true;
  const v = user.landlord_profile?.is_verified;
  const verified = Number(v) === 1 || v === true;
  if (role === 'landlord' && verified) return true;
  return false;
}

/** Chủ nhà đã duyệt (không gồm admin). */
export function isApprovedLandlordAccount(user) {
  if (!user?.role) return false;
  if (String(user.role).toLowerCase() !== 'landlord') return false;
  const v = user.landlord_profile?.is_verified;
  return Number(v) === 1 || v === true;
}

/** Đã gửi hồ sơ chủ nhà, chưa được duyệt (is_verified ≠ 1) */
export function hasPendingLandlordApplication(user) {
  if (!user?.landlord_profile) return false;
  const v = user.landlord_profile.is_verified;
  return Number(v) !== 1 && v !== true;
}

/** Menu "Quản lý phòng" / khu vực chủ nhà — chỉ chủ nhà đã duyệt (admin dùng /admin). */
export function canPostAndManageRooms(user) {
  return isApprovedLandlordAccount(user);
}

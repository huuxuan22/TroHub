/** @param {{ role?: string; landlord_profile?: { is_verified?: boolean } | null } | null | undefined} user */
export function canPostRoom(user) {
  if (!user?.role) return false;
  if (user.role === 'admin') return true;
  if (user.role === 'landlord' && user.landlord_profile?.is_verified) return true;
  return false;
}

/** Đã gửi hồ sơ chủ phòng, chưa được xác minh */
export function hasPendingLandlordApplication(user) {
  if (!user?.landlord_profile) return false;
  return !user.landlord_profile.is_verified;
}

/** Quản lý tin / đăng tin (chỉ chủ phòng đã duyệt hoặc admin) */
export function canPostAndManageRooms(user) {
  return canPostRoom(user);
}

import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { canPostRoom, hasPendingLandlordApplication } from '../../utils/userRoles';

/**
 * Chỉ cho phép vào trang đăng tin / quản lý khi admin hoặc chủ phòng đã được xác minh.
 * Người thuê có hồ sơ chờ duyệt → /landlord-pending; chưa nộp hồ sơ → /become-landlord.
 */
export default function VerifiedListingGate({ children }) {
  const { user, authLoading } = useAuth();
  const location = useLocation();

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center pt-20 bg-slate-50 text-gray-500 text-sm">
        Đang tải...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (user.role === 'admin') {
    return children;
  }

  if (canPostRoom(user)) {
    return children;
  }

  if (hasPendingLandlordApplication(user)) {
    return <Navigate to="/landlord-pending" replace />;
  }

  return <Navigate to="/become-landlord" replace state={{ from: location.pathname }} />;
}

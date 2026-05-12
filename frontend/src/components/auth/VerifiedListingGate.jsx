import React, { useEffect, useRef, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { canPostRoom, hasPendingLandlordApplication } from '../../utils/userRoles';

/**
 * Chỉ cho phép vào trang đăng tin / quản lý khi admin hoặc chủ phòng đã được xác minh.
 * Người thuê có hồ sơ chờ duyệt → /landlord-pending; chưa nộp hồ sơ → /become-landlord.
 * Sau /me dùng dữ liệu trả về (không chỉ context) để tránh một nhịp render với user cũ — form đăng tin hiện đúng khi đã duyệt.
 */
export default function VerifiedListingGate({ children }) {
  const { user, authLoading, refreshUser } = useAuth();
  const location = useLocation();
  const userRef = useRef(user);
  userRef.current = user;

  const [gate, setGate] = useState({ loading: true, me: null });

  useEffect(() => {
    if (authLoading) return;
    let cancelled = false;
    setGate({ loading: true, me: null });
    (async () => {
      try {
        const me = await refreshUser();
        if (!cancelled) setGate({ loading: false, me });
      } catch {
        if (!cancelled) setGate({ loading: false, me: userRef.current });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authLoading, location.pathname, refreshUser]);

  if (authLoading || gate.loading) {
    return (
      <div className="min-h-screen flex items-center justify-center pt-20 bg-slate-50 text-gray-500 text-sm">
        Đang tải...
      </div>
    );
  }

  const effective = gate.me;

  if (!effective) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (String(effective.role).toLowerCase() === 'admin') {
    return children;
  }

  if (canPostRoom(effective)) {
    return children;
  }

  if (hasPendingLandlordApplication(effective)) {
    return <Navigate to="/landlord-pending" replace />;
  }

  return <Navigate to="/become-landlord" replace state={{ from: location.pathname }} />;
}

import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { canPostRoom, hasPendingLandlordApplication } from '../utils/userRoles';

export default function LandlordPendingPage() {
  const { user, authLoading, refreshUser } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (authLoading || !user) return;
    if (canPostRoom(user)) {
      navigate('/post', { replace: true });
    } else if (!hasPendingLandlordApplication(user)) {
      navigate('/become-landlord', { replace: true });
    }
  }, [authLoading, user, navigate]);

  const handleRecheck = async () => {
    await refreshUser();
  };

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center pt-20 bg-slate-50 text-gray-500 text-sm">
        Đang tải...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pt-20 pb-12 px-4">
      <div className="max-w-lg mx-auto text-center">
        <div className="bg-white rounded-2xl border border-amber-100 shadow-sm p-8">
          <div className="text-5xl mb-4">⏳</div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Đang chờ admin xác minh</h1>
          <p className="text-sm text-gray-600 mb-6">
            Hồ sơ chủ phòng của bạn đã được gửi. Sau khi admin duyệt, bạn có thể đăng tin cho thuê. Quá trình có thể mất
            vài giờ đến vài ngày làm việc.
          </p>
          <button
            type="button"
            onClick={handleRecheck}
            className="inline-flex items-center justify-center rounded-xl bg-blue-600 text-white px-5 py-2.5 text-sm font-semibold hover:bg-blue-700 transition-colors mb-4"
          >
            Kiểm tra lại trạng thái
          </button>
          <p className="text-xs text-gray-400 mb-4">
            Admin duyệt hồ sơ trên hệ thống nội bộ (API PATCH kèm mã người dùng của bạn).
          </p>
          <Link to="/" className="text-blue-600 text-sm font-medium hover:underline">
            Về trang chủ
          </Link>
        </div>
      </div>
    </div>
  );
}

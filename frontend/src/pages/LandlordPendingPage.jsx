import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { canPostRoom, hasPendingLandlordApplication } from '../utils/userRoles';

/**
 * Chờ admin duyệt hồ sơ (landlord_profiles.is_verified = 0).
 * Luôn gọi /me trước rồi mới quyết định redirect — khớp với trạng thái 0/1 trên server.
 */
export default function LandlordPendingPage() {
  const { user, authLoading, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [phase, setPhase] = useState('loading'); // loading | ready

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setPhase('ready');
      return;
    }
    let cancelled = false;
    setPhase('loading');
    (async () => {
      try {
        const me = await refreshUser();
        if (cancelled) return;
        if (!me) {
          navigate('/login', { replace: true, state: { from: '/landlord-pending' } });
          return;
        }
        if (canPostRoom(me)) {
          navigate('/post', { replace: true });
          return;
        }
        if (!hasPendingLandlordApplication(me)) {
          navigate('/become-landlord', { replace: true });
          return;
        }
        setPhase('ready');
      } catch {
        if (!cancelled) setPhase('ready');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authLoading, user?.id, refreshUser, navigate]);

  const handleRecheck = async () => {
    setPhase('loading');
    try {
      const me = await refreshUser();
      if (!me) {
        navigate('/login', { replace: true, state: { from: '/landlord-pending' } });
        return;
      }
      if (canPostRoom(me)) {
        navigate('/post', { replace: true });
        return;
      }
      if (!hasPendingLandlordApplication(me)) {
        navigate('/become-landlord', { replace: true });
        return;
      }
    } finally {
      setPhase('ready');
    }
  };

  if (authLoading || !user || phase === 'loading') {
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
            Hồ sơ chủ nhà của bạn đã được gửi và đang chờ xác minh. Sau khi được duyệt, bạn có thể đăng tin cho thuê.
            Thời gian xử lý có thể từ vài giờ đến vài ngày làm việc.
          </p>
          <button
            type="button"
            onClick={handleRecheck}
            className="inline-flex items-center justify-center rounded-xl bg-blue-600 text-white px-5 py-2.5 text-sm font-semibold hover:bg-blue-700 transition-colors mb-3"
          >
            Kiểm tra lại trạng thái
          </button>
          <p className="text-sm text-gray-500 mb-4">
            <Link to="/become-landlord" className="text-blue-600 font-medium hover:underline">
              Cập nhật lại hồ sơ
            </Link>
            {' · '}
            <Link to="/" className="text-blue-600 font-medium hover:underline">
              Về trang chủ
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

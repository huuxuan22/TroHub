import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { canPostRoom, hasPendingLandlordApplication } from '../utils/userRoles';
import { submitLandlordApplication } from '../services/landlordApi';

/**
 * Gửi / cập nhật hồ sơ chủ nhà (is_verified = 0). Đã duyệt (1) hoặc đang chờ → chuyển đúng trang.
 */
export default function BecomeLandlordPage() {
  const { user, authLoading, refreshUser } = useAuth();
  const navigate = useNavigate();
  const userRef = useRef(user);
  userRef.current = user;
  const [form, setForm] = useState({
    business_name: '',
    national_id: '',
    business_license: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [pageReady, setPageReady] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setPageReady(false);
      return;
    }
    let cancelled = false;
    setPageReady(false);
    (async () => {
      try {
        const me = await refreshUser();
        if (cancelled || !me) {
          if (!cancelled && !me) {
            navigate('/login', { replace: true, state: { from: '/become-landlord' } });
          }
          return;
        }
        if (canPostRoom(me)) {
          navigate('/post', { replace: true });
          return;
        }
        if (hasPendingLandlordApplication(me)) {
          navigate('/landlord-pending', { replace: true });
          return;
        }
        const p = me.landlord_profile;
        if (p) {
          setForm({
            business_name: p.business_name || '',
            national_id: p.national_id || '',
            business_license: p.business_license || '',
          });
        }
        setPageReady(true);
      } catch {
        if (cancelled) return;
        const u = userRef.current;
        if (u && canPostRoom(u)) {
          navigate('/post', { replace: true });
          return;
        }
        if (u && hasPendingLandlordApplication(u)) {
          navigate('/landlord-pending', { replace: true });
          return;
        }
        const p = u?.landlord_profile;
        if (p) {
          setForm({
            business_name: p.business_name || '',
            national_id: p.national_id || '',
            business_license: p.business_license || '',
          });
        }
        setPageReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authLoading, user?.id, refreshUser, navigate]);

  const update = (k, v) => setForm((prev) => ({ ...prev, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await submitLandlordApplication(form);
      await refreshUser();
      navigate('/landlord-pending', { replace: true });
    } catch (err) {
      setError(err.message || 'Gửi hồ sơ thất bại');
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || !user || !pageReady) {
    return (
      <div className="min-h-screen flex items-center justify-center pt-20 bg-slate-50 text-gray-500 text-sm">
        Đang tải...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pt-20 pb-12 px-4">
      <div className="max-w-lg mx-auto">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sm:p-8">
          <p className="text-sm font-semibold text-blue-600 mb-2">Đăng ký làm chủ nhà</p>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Bổ sung thông tin chủ nhà</h1>
          <p className="text-sm text-gray-500 mb-6">
            Sau khi gửi, hồ sơ của bạn chuyển sang trạng thái chờ admin xác minh. Khi được duyệt, bạn có thể đăng tin cho
            thuê và quản lý phòng trên TroHub.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="text-sm bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2">
                {error}
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Tên hiển thị / tên kinh doanh</label>
              <input
                required
                value={form.business_name}
                onChange={(e) => update('business_name', e.target.value)}
                className={inputCls}
                placeholder="VD: Nhà trọ Minh Anh"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">CMND / CCCD</label>
              <input
                required
                minLength={6}
                value={form.national_id}
                onChange={(e) => update('national_id', e.target.value)}
                className={inputCls}
                placeholder="Số giấy tờ tùy thân"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Giấy phép kinh doanh (tuỳ chọn)</label>
              <input
                value={form.business_license}
                onChange={(e) => update('business_license', e.target.value)}
                className={inputCls}
                placeholder="Số GPĐKKD nếu có"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-semibold transition-colors"
            >
              {loading ? 'Đang gửi...' : 'Gửi hồ sơ chờ duyệt'}
            </button>
          </form>

          <p className="text-sm text-gray-600 mt-5 text-center">
            <Link to="/landlord-pending" className="text-blue-600 font-medium hover:underline">
              Đã gửi hồ sơ? Xem trạng thái chờ duyệt
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

const inputCls =
  'w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';

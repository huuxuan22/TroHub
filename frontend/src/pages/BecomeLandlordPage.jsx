import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { canPostRoom, hasPendingLandlordApplication } from '../utils/userRoles';
import { submitLandlordApplication } from '../services/landlordApi';

export default function BecomeLandlordPage() {
  const { user, authLoading, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    business_name: '',
    national_id: '',
    business_license: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (authLoading || !user) return;
    if (canPostRoom(user)) {
      navigate('/post', { replace: true });
      return;
    }
    if (hasPendingLandlordApplication(user)) {
      navigate('/landlord-pending', { replace: true });
      return;
    }
    const p = user.landlord_profile;
    if (p) {
      setForm({
        business_name: p.business_name || '',
        national_id: p.national_id || '',
        business_license: p.business_license || '',
      });
    }
  }, [authLoading, user, navigate]);

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

  if (authLoading || !user) {
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
          <p className="text-sm font-semibold text-blue-600 mb-2">Đăng ký làm chủ phòng</p>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Bổ sung thông tin chủ nhà</h1>
          <p className="text-sm text-gray-500 mb-6">
            Sau khi gửi, tài khoản của bạn sẽ chờ admin xác minh. Khi được duyệt, bạn có thể đăng tin cho thuê.
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

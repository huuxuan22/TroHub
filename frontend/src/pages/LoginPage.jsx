import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { canPostAndManageRooms } from '../utils/userRoles';
import PasswordInput from '../components/common/PasswordInput';

export default function LoginPage() {
  const [form, setForm] = useState({ email: '', password: '', remember: true });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  useEffect(() => {
    const st = location.state;
    if (st?.fromRegister && st?.email) {
      const email = String(st.email).trim();
      setForm((prev) => ({ ...prev, email }));
      setSuccessMsg('Đăng ký thành công. Vui lòng đăng nhập bằng email và mật khẩu bạn vừa tạo.');
      navigate(location.pathname, { replace: true, state: null });
    }
  }, [location.pathname, location.state, navigate]);

  const update = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const me = await login(form.email.trim(), form.password);
      const from = location.state?.from;
      const isAdmin = String(me?.role).toLowerCase() === 'admin';
      if (typeof from === 'string' && from.startsWith('/')) {
        navigate(from, { replace: true });
      } else if (isAdmin) {
        navigate('/admin');
      } else if (canPostAndManageRooms(me)) {
        navigate('/manage');
      } else {
        navigate('/');
      }
    } catch (err) {
      setError(err.message || 'Đăng nhập thất bại');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 pt-20 pb-10 px-4">
      <div className="max-w-md mx-auto">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sm:p-8">
          <p className="text-sm font-semibold text-blue-600 mb-2">Chào mừng quay lại</p>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Đăng nhập TroHub</h1>
          <p className="text-sm text-gray-500 mb-6">Đăng nhập để đăng tin và quản lý phòng trọ của bạn.</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {successMsg && (
              <div className="text-sm bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg px-3 py-2">
                {successMsg}
              </div>
            )}
            {error && (
              <div className="text-sm bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2">
                {error}
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
              <input
                type="email"
                required
                value={form.email}
                onChange={(e) => update('email', e.target.value)}
                placeholder="you@example.com"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label htmlFor="login-password" className="block text-sm font-medium text-gray-700 mb-1.5">
                Mật khẩu
              </label>
              <PasswordInput
                id="login-password"
                required
                value={form.password}
                onChange={(e) => update('password', e.target.value)}
                placeholder="Nhập mật khẩu"
                autoComplete="current-password"
              />
            </div>

            <div className="flex items-center justify-between text-sm">
              <label className="inline-flex items-center gap-2 text-gray-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.remember}
                  onChange={(e) => update('remember', e.target.checked)}
                  className="accent-blue-600"
                />
                Ghi nhớ đăng nhập
              </label>
              <Link to="/forgot-password" className="text-blue-600 hover:underline">
                Quên mật khẩu?
              </Link>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-semibold transition-colors"
            >
              {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
            </button>
          </form>

          <p className="text-sm text-gray-600 mt-5 text-center">
            Chưa có tài khoản?{' '}
            <Link to="/register" className="text-blue-600 font-medium hover:underline">
              Tạo tài khoản mới
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

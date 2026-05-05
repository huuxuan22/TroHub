import React, { useState } from 'react';
import { Link } from 'react-router-dom';

export default function LoginPage() {
  const [form, setForm] = useState({ email: '', password: '', remember: true });

  const update = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = (e) => {
    e.preventDefault();
    // TODO: connect login API
    console.log('login payload', form);
  };

  return (
    <div className="min-h-screen bg-slate-50 pt-20 pb-10 px-4">
      <div className="max-w-md mx-auto">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sm:p-8">
          <p className="text-sm font-semibold text-blue-600 mb-2">Chào mừng quay lại</p>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Đăng nhập TroHub</h1>
          <p className="text-sm text-gray-500 mb-6">Đăng nhập để đăng tin và quản lý phòng trọ của bạn.</p>

          <form onSubmit={handleSubmit} className="space-y-4">
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
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Mật khẩu</label>
              <input
                type="password"
                required
                value={form.password}
                onChange={(e) => update('password', e.target.value)}
                placeholder="Nhập mật khẩu"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
              <a href="#" className="text-blue-600 hover:underline">Quên mật khẩu?</a>
            </div>

            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-semibold transition-colors"
            >
              Đăng nhập
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

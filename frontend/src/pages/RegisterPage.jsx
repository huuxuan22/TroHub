import React, { useState } from 'react';
import { Link } from 'react-router-dom';

export default function RegisterPage() {
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    role: 'tenant',
    agree: false,
  });

  const update = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = (e) => {
    e.preventDefault();
    // TODO: connect register API
    console.log('register payload', form);
  };

  return (
    <div className="min-h-screen bg-slate-50 pt-20 pb-10 px-4">
      <div className="max-w-xl mx-auto">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sm:p-8">
          <p className="text-sm font-semibold text-blue-600 mb-2">Bắt đầu với TroHub</p>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Đăng ký tài khoản</h1>
          <p className="text-sm text-gray-500 mb-6">Tạo tài khoản để tìm phòng nhanh hoặc đăng tin cho thuê.</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Họ và tên">
                <input
                  required
                  value={form.fullName}
                  onChange={(e) => update('fullName', e.target.value)}
                  className={inputCls}
                  placeholder="Nguyễn Văn A"
                />
              </Field>

              <Field label="Số điện thoại">
                <input
                  required
                  value={form.phone}
                  onChange={(e) => update('phone', e.target.value)}
                  className={inputCls}
                  placeholder="0901234567"
                />
              </Field>
            </div>

            <Field label="Email">
              <input
                type="email"
                required
                value={form.email}
                onChange={(e) => update('email', e.target.value)}
                className={inputCls}
                placeholder="you@example.com"
              />
            </Field>

            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Mật khẩu">
                <input
                  type="password"
                  required
                  value={form.password}
                  onChange={(e) => update('password', e.target.value)}
                  className={inputCls}
                  placeholder="Ít nhất 8 ký tự"
                />
              </Field>

              <Field label="Nhập lại mật khẩu">
                <input
                  type="password"
                  required
                  value={form.confirmPassword}
                  onChange={(e) => update('confirmPassword', e.target.value)}
                  className={inputCls}
                  placeholder="Nhập lại mật khẩu"
                />
              </Field>
            </div>

              <Field label="Bạn là">
              <select
                value={form.role}
                onChange={(e) => update('role', e.target.value)}
                className={inputCls}
              >
                <option value="tenant">Người thuê trọ</option>
                <option value="landlord">Chủ phòng trọ</option>
              </select>
            </Field>

            <label className="inline-flex items-start gap-2 text-sm text-gray-600 cursor-pointer">
              <input
                type="checkbox"
                checked={form.agree}
                onChange={(e) => update('agree', e.target.checked)}
                className="mt-1 accent-blue-600"
                required
              />
              <span>
                Tôi đồng ý với <a href="#" className="text-blue-600 hover:underline">Điều khoản dịch vụ</a> và{' '}
                <a href="#" className="text-blue-600 hover:underline">Chính sách bảo mật</a>.
              </span>
            </label>

            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-semibold transition-colors"
            >
              Tạo tài khoản
            </button>
          </form>

          <p className="text-sm text-gray-600 mt-5 text-center">
            Đã có tài khoản?{' '}
            <Link to="/login" className="text-blue-600 font-medium hover:underline">
              Đăng nhập ngay
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
      {children}
    </div>
  );
}

const inputCls = 'w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';

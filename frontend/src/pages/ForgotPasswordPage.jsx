import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitting(true);
    // TODO: gọi API gửi link đặt lại mật khẩu
    console.log('forgot-password', { email });
    window.setTimeout(() => {
      setSubmitting(false);
      setSent(true);
    }, 600);
  };

  const handleResend = () => {
    setSent(false);
    setEmail('');
  };

  return (
    <div className="min-h-screen bg-slate-50 pt-20 pb-10 px-4">
      <div className="max-w-md mx-auto">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sm:p-8">
          {!sent ? (
            <>
              <p className="text-sm font-semibold text-blue-600 mb-2">Khôi phục tài khoản</p>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Quên mật khẩu?</h1>
              <p className="text-sm text-gray-500 mb-6">
                Nhập email đã đăng ký. Chúng tôi sẽ gửi hướng dẫn đặt lại mật khẩu trong vài phút.
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="forgot-email" className="block text-sm font-medium text-gray-700 mb-1.5">
                    Email
                  </label>
                  <input
                    id="forgot-email"
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-70 disabled:pointer-events-none text-white py-3 rounded-xl font-semibold transition-colors"
                >
                  {submitting ? 'Đang gửi…' : 'Gửi link đặt lại mật khẩu'}
                </button>
              </form>

              <p className="text-sm text-gray-600 mt-6 text-center">
                <Link to="/login" className="text-blue-600 font-medium hover:underline">
                  ← Quay lại đăng nhập
                </Link>
              </p>
            </>
          ) : (
            <div className="text-center">
              <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                <Mail className="w-7 h-7" strokeWidth={1.75} aria-hidden />
              </div>
              <h1 className="text-xl font-bold text-gray-900 mb-2">Đã gửi email</h1>
              <p className="text-sm text-gray-600 mb-1">
                Kiểm tra hộp thư <span className="font-semibold text-gray-900">{email}</span>
              </p>
              <p className="text-sm text-gray-500 mb-6">
                Nếu không thấy, hãy xem thư mục spam hoặc quảng cáo. Link có hiệu lực trong thời gian giới hạn.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <button
                  type="button"
                  onClick={handleResend}
                  className="text-sm font-medium text-blue-600 hover:underline py-2"
                >
                  Gửi lại cho email khác
                </button>
                <Link
                  to="/login"
                  className="inline-flex justify-center items-center rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-800 hover:bg-gray-50 transition-colors"
                >
                  Về đăng nhập
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

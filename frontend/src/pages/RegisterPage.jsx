import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import PasswordInput from '../components/common/PasswordInput';

export default function RegisterPage() {
  const [step, setStep] = useState('details');
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    verificationCode: '',
    agree: false,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const navigate = useNavigate();
  const { register, requestRegistrationCode } = useAuth();

  const update = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const buildRegistrationPayload = () => ({
    full_name: form.fullName.trim(),
    email: form.email.trim(),
    phone_number: form.phone.trim(),
    password: form.password,
  });

  const validateDetails = () => {
    if (form.password !== form.confirmPassword) {
      return 'Mật khẩu nhập lại không khớp.';
    }
    const phone = form.phone.trim();
    if (!phone) {
      return 'Vui lòng nhập số điện thoại.';
    }
    const digits = phone.replace(/\D/g, '');
    if (digits.length < 9) {
      return 'Số điện thoại phải có ít nhất 9 chữ số.';
    }
    return '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');

    setLoading(true);
    try {
      if (step === 'details') {
        const detailError = validateDetails();
        if (detailError) {
          setError(detailError);
          setLoading(false);
          return;
        }
        await requestRegistrationCode(buildRegistrationPayload());
        setStep('code');
        setMessage(`Đã gửi mã xác thực đến ${form.email.trim()}. Vui lòng kiểm tra hộp thư Gmail hoặc email.`);
        return;
      }

      const code = form.verificationCode.trim();
      if (!/^\d{6}$/.test(code)) {
        setError('Vui lòng nhập mã xác thực gồm 6 chữ số.');
        setLoading(false);
        return;
      }
      await register({
        ...buildRegistrationPayload(),
        verification_code: code,
      });
      navigate('/login', { state: { fromRegister: true, email: form.email.trim() } });
    } catch (err) {
      setError(err.message || 'Đăng ký thất bại');
    } finally {
      setLoading(false);
    }
  };

  const handleEditDetails = () => {
    setStep('details');
    setForm((prev) => ({ ...prev, verificationCode: '' }));
    setError('');
    setMessage('');
  };

  const handleResendCode = async () => {
    setError('');
    setMessage('');
    const detailError = validateDetails();
    if (detailError) {
      setError(detailError);
      return;
    }
    setLoading(true);
    try {
      await requestRegistrationCode(buildRegistrationPayload());
      setMessage(`Đã gửi lại mã xác thực đến ${form.email.trim()}.`);
    } catch (err) {
      setError(err.message || 'Không gửi lại được mã xác thực');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 pt-20 pb-10 px-4">
      <div className="max-w-xl mx-auto">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sm:p-8">
          <p className="text-sm font-semibold text-blue-600 mb-2">Bắt đầu với TroHub</p>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Đăng ký tài khoản</h1>
          <p className="text-sm text-gray-500 mb-6">
            Tạo tài khoản để tìm phòng và lưu tin yêu thích. Số điện thoại là bắt buộc để liên hệ khi cần.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="text-sm bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2">
                {error}
              </div>
            )}
            {message && (
              <div className="text-sm bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg px-3 py-2">
                {message}
              </div>
            )}

            {step === 'details' ? (
              <>
                <Field label="Họ và tên">
                  <input
                    required
                    value={form.fullName}
                    onChange={(e) => update('fullName', e.target.value)}
                    className={inputCls}
                    placeholder="Nguyễn Văn A"
                  />
                </Field>

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

                <Field label="Số điện thoại (bắt buộc)">
                  <input
                    type="tel"
                    inputMode="numeric"
                    autoComplete="tel"
                    required
                    minLength={9}
                    value={form.phone}
                    onChange={(e) => update('phone', e.target.value)}
                    className={inputCls}
                    placeholder="VD: 0901234567 hoặc +84901234567"
                  />
                  <p className="text-xs text-gray-500 mt-1">Ít nhất 9 chữ số (bỏ khoảng trắng sẽ được kiểm tra khi gửi).</p>
                </Field>

                <div className="grid sm:grid-cols-2 gap-4">
                  <Field label="Mật khẩu" htmlFor="reg-password">
                    <PasswordInput
                      id="reg-password"
                      required
                      value={form.password}
                      onChange={(e) => update('password', e.target.value)}
                      placeholder="Ít nhất 8 ký tự"
                      autoComplete="new-password"
                    />
                  </Field>

                  <Field label="Nhập lại mật khẩu" htmlFor="reg-password-confirm">
                    <PasswordInput
                      id="reg-password-confirm"
                      required
                      value={form.confirmPassword}
                      onChange={(e) => update('confirmPassword', e.target.value)}
                      placeholder="Nhập lại mật khẩu"
                      autoComplete="new-password"
                    />
                  </Field>
                </div>

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
              </>
            ) : (
              <>
                <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3">
                  <p className="text-sm text-blue-900">
                    Nhập mã 6 chữ số đã gửi đến <span className="font-semibold">{form.email.trim()}</span>.
                  </p>
                </div>

                <Field label="Mã xác thực">
                  <input
                    required
                    inputMode="numeric"
                    maxLength={6}
                    value={form.verificationCode}
                    onChange={(e) => update('verificationCode', e.target.value.replace(/\D/g, '').slice(0, 6))}
                    className={`${inputCls} text-center text-lg font-semibold`}
                    placeholder="000000"
                  />
                </Field>
              </>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-semibold transition-colors"
            >
              {loading ? 'Đang xử lý...' : step === 'details' ? 'Gửi mã xác thực' : 'Xác thực và tạo tài khoản'}
            </button>

            {step === 'code' && (
              <div className="grid sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={handleResendCode}
                  disabled={loading}
                  className="w-full border border-blue-200 text-blue-700 py-3 rounded-xl font-semibold hover:bg-blue-50 transition-colors"
                >
                  Gửi lại mã
                </button>
                <button
                  type="button"
                  onClick={handleEditDetails}
                  className="w-full border border-gray-200 text-gray-700 py-3 rounded-xl font-semibold hover:bg-gray-50 transition-colors"
                >
                  Sửa thông tin
                </button>
              </div>
            )}
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

function Field({ label, children, htmlFor }) {
  return (
    <div>
      <label htmlFor={htmlFor} className="block text-sm font-medium text-gray-700 mb-1.5">
        {label}
      </label>
      {children}
    </div>
  );
}

const inputCls = 'w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';

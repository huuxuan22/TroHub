import React, { useState } from 'react';
import { CATEGORIES, CITIES, AMENITIES } from '../data/mockData';

const STEPS = [
  { id: 1, label: 'Thông tin cơ bản', icon: '🧾' },
  { id: 2, label: 'Hình ảnh & Tiện ích', icon: '🖼️' },
  { id: 3, label: 'Giá & Liên hệ', icon: '💸' },
  { id: 4, label: 'Xác nhận', icon: '🎉' },
];

export default function PostRoomPage() {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    title: '', type: '', city: '', address: '', area: '',
    description: '', amenities: [], price: '', deposit: '',
    contactName: '', contactPhone: '', contactEmail: '',
    images: [],
  });

  const update = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));
  const toggleAmenity = (id) => {
    const next = form.amenities.includes(id)
      ? form.amenities.filter((a) => a !== id)
      : [...form.amenities, id];
    update('amenities', next);
  };

  const isStepValid = () => {
    if (step === 1) return form.title && form.type && form.city && form.address && form.area;
    if (step === 3) return form.price && form.contactName && form.contactPhone;
    return true;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (step < 4) setStep(step + 1);
  };

  return (
    <div className="min-h-screen bg-slate-50 pt-16">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Đăng tin cho thuê</h1>
          <p className="text-gray-500">Tiếp cận hàng nghìn người thuê trọ tiềm năng</p>
        </div>

        {/* Progress steps */}
        <div className="flex items-center justify-between mb-8 relative">
          <div className="absolute top-5 left-0 right-0 h-0.5 bg-gray-200 z-0">
            <div
              className="h-full bg-blue-600 transition-all duration-500"
              style={{ width: `${((step - 1) / (STEPS.length - 1)) * 100}%` }}
            />
          </div>
          {STEPS.map((s) => (
            <div key={s.id} className="relative z-10 flex flex-col items-center gap-2">
              <button
                onClick={() => s.id < step && setStep(s.id)}
                className={`w-10 h-10 rounded-full flex items-center justify-center text-base transition-all duration-300 border-2 ${
                  step > s.id
                    ? 'bg-blue-600 border-blue-600 text-white'
                    : step === s.id
                    ? 'bg-white border-blue-600 text-blue-600 shadow-md shadow-blue-100'
                    : 'bg-white border-gray-200 text-gray-400'
                }`}
              >
                {step > s.id ? '✓' : s.icon}
              </button>
              <span className={`text-xs font-medium hidden sm:block ${step >= s.id ? 'text-blue-600' : 'text-gray-400'}`}>
                {s.label}
              </span>
            </div>
          ))}
        </div>

        <form onSubmit={handleSubmit}>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-8">
            {/* Step 1 */}
            {step === 1 && (
              <div className="space-y-5">
                <SectionTitle icon="🧾" title="Thông tin cơ bản" />

                <FormField label="Tiêu đề tin đăng *">
                  <input
                    value={form.title}
                    onChange={(e) => update('title', e.target.value)}
                    placeholder="VD: Phòng trọ cao cấp, full nội thất, gần ĐH Bách Khoa"
                    className={inputCls}
                    required
                  />
                </FormField>

                <div className="grid sm:grid-cols-2 gap-5">
                  <FormField label="Loại hình *">
                    <select value={form.type} onChange={(e) => update('type', e.target.value)} className={inputCls} required>
                      <option value="">Chọn loại hình</option>
                      {CATEGORIES.map((c) => <option key={c.id} value={c.label}>{c.icon} {c.label}</option>)}
                    </select>
                  </FormField>
                  <FormField label="Tỉnh/Thành phố *">
                    <select value={form.city} onChange={(e) => update('city', e.target.value)} className={inputCls} required>
                      <option value="">Chọn tỉnh/thành</option>
                      {CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </FormField>
                </div>

                <FormField label="Địa chỉ cụ thể *">
                  <input
                    value={form.address}
                    onChange={(e) => update('address', e.target.value)}
                    placeholder="Số nhà, đường, phường/xã, quận/huyện"
                    className={inputCls}
                    required
                  />
                </FormField>

                <FormField label="Diện tích (m²) *">
                  <input
                    type="number"
                    value={form.area}
                    onChange={(e) => update('area', e.target.value)}
                    placeholder="VD: 25"
                    className={inputCls}
                    min="1"
                    required
                  />
                </FormField>

                <FormField label="Mô tả chi tiết">
                  <textarea
                    value={form.description}
                    onChange={(e) => update('description', e.target.value)}
                    placeholder="Mô tả chi tiết về phòng: nội thất, tình trạng, quy định nhà trọ..."
                    className={`${inputCls} resize-none`}
                    rows={4}
                  />
                </FormField>
              </div>
            )}

            {/* Step 2 */}
            {step === 2 && (
              <div className="space-y-6">
                <SectionTitle icon="🖼️" title="Hình ảnh & Tiện ích" />

                {/* Image upload */}
                <FormField label="Hình ảnh phòng">
                  <div className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center hover:border-blue-300 hover:bg-blue-50 transition-all cursor-pointer group">
                    <div className="text-4xl mb-3">🖼️</div>
                    <p className="font-medium text-gray-700 group-hover:text-blue-600">Kéo thả hoặc nhấn để tải ảnh</p>
                    <p className="text-sm text-gray-400 mt-1">PNG, JPG tối đa 5MB. Tối đa 10 ảnh</p>
                    <button type="button" className="mt-3 text-sm bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
                      Chọn ảnh
                    </button>
                  </div>
                </FormField>

                {/* Amenities */}
                <FormField label="Tiện ích">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {AMENITIES.map((a) => (
                      <button
                        key={a.id}
                        type="button"
                        onClick={() => toggleAmenity(a.id)}
                        className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 text-sm transition-all duration-200 ${
                          form.amenities.includes(a.id)
                            ? 'border-blue-500 bg-blue-50 text-blue-700 font-medium'
                            : 'border-gray-200 text-gray-600 hover:border-blue-300'
                        }`}
                      >
                        <span>{a.icon}</span>
                        <span>{a.label}</span>
                      </button>
                    ))}
                  </div>
                </FormField>
              </div>
            )}

            {/* Step 3 */}
            {step === 3 && (
              <div className="space-y-5">
                <SectionTitle icon="💸" title="Giá & Liên hệ" />

                <div className="grid sm:grid-cols-2 gap-5">
                  <FormField label="Giá thuê/tháng (VNĐ) *">
                    <input
                      type="number"
                      value={form.price}
                      onChange={(e) => update('price', e.target.value)}
                      placeholder="VD: 3500000"
                      className={inputCls}
                      min="0"
                      required
                    />
                  </FormField>
                  <FormField label="Tiền cọc (VNĐ)">
                    <input
                      type="number"
                      value={form.deposit}
                      onChange={(e) => update('deposit', e.target.value)}
                      placeholder="VD: 7000000"
                      className={inputCls}
                      min="0"
                    />
                  </FormField>
                </div>

                <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
                  <p className="text-sm font-semibold text-blue-800 mb-1">✨ Gợi ý giá từ AI</p>
                  <p className="text-sm text-blue-700">
                    Dựa trên vị trí và loại phòng, mức giá hợp lý cho khu vực này là{' '}
                    <strong>2.5 - 4 triệu/tháng</strong>
                  </p>
                </div>

                <SectionTitle icon="📞" title="Thông tin liên hệ" />

                <FormField label="Họ và tên *">
                  <input
                    value={form.contactName}
                    onChange={(e) => update('contactName', e.target.value)}
                    placeholder="Tên chủ phòng/đại lý"
                    className={inputCls}
                    required
                  />
                </FormField>

                <div className="grid sm:grid-cols-2 gap-5">
                  <FormField label="Số điện thoại *">
                    <input
                      type="tel"
                      value={form.contactPhone}
                      onChange={(e) => update('contactPhone', e.target.value)}
                      placeholder="0901234567"
                      className={inputCls}
                      required
                    />
                  </FormField>
                  <FormField label="Email">
                    <input
                      type="email"
                      value={form.contactEmail}
                      onChange={(e) => update('contactEmail', e.target.value)}
                      placeholder="email@example.com"
                      className={inputCls}
                    />
                  </FormField>
                </div>
              </div>
            )}

            {/* Step 4 */}
            {step === 4 && (
              <div className="space-y-6">
                <SectionTitle icon="🎉" title="Xác nhận thông tin" />

                <div className="space-y-4">
                  <ReviewItem label="Tiêu đề" value={form.title} />
                  <ReviewItem label="Loại hình" value={form.type} />
                  <ReviewItem label="Địa chỉ" value={`${form.address}, ${form.city}`} />
                  <ReviewItem label="Diện tích" value={`${form.area} m²`} />
                  <ReviewItem label="Giá thuê" value={form.price ? `${(parseInt(form.price) / 1000000).toFixed(1)} triệu/tháng` : 'Chưa nhập'} />
                  <ReviewItem label="Liên hệ" value={`${form.contactName} - ${form.contactPhone}`} />
                </div>

                <div className="p-4 bg-green-50 border border-green-200 rounded-xl">
                  <p className="text-sm text-green-800 font-medium flex items-center gap-2">
                    <span>🤖</span>
                    AI TroHub sẽ tự động tối ưu hóa tin đăng của bạn để tiếp cận đúng đối tượng tìm kiếm.
                  </p>
                </div>

                <div className="flex items-start gap-3">
                  <input type="checkbox" id="terms" className="mt-0.5 accent-blue-600" required />
                  <label htmlFor="terms" className="text-sm text-gray-600">
                    Tôi đồng ý với{' '}
                    <a href="/terms" className="text-blue-600 hover:underline">Điều khoản dịch vụ</a>{' '}
                    và{' '}
                    <a href="/privacy" className="text-blue-600 hover:underline">Chính sách bảo mật</a>{' '}
                    của TroHub.
                  </label>
                </div>
              </div>
            )}
          </div>

          {/* Navigation buttons */}
          <div className="flex items-center justify-between mt-6">
            <button
              type="button"
              onClick={() => setStep(Math.max(1, step - 1))}
              disabled={step === 1}
              className="flex items-center gap-2 px-6 py-3 border border-gray-200 text-gray-600 rounded-xl font-medium hover:bg-gray-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              ← Quay lại
            </button>

            <div className="flex items-center gap-2 text-sm text-gray-400">
              {step}/{STEPS.length}
            </div>

            {step < 4 ? (
              <button
                type="submit"
                disabled={!isStepValid()}
                className="flex items-center gap-2 px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Tiếp theo →
              </button>
            ) : (
              <button
                type="submit"
                className="flex items-center gap-2 px-8 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-semibold transition-colors"
              >
                ✅ Đăng tin ngay
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}

const inputCls = 'w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white transition-all';

function FormField({ label, children }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
      {children}
    </div>
  );
}

function SectionTitle({ icon, title }) {
  return (
    <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2 pb-3 border-b border-gray-100">
      <span>{icon}</span> {title}
    </h2>
  );
}

function ReviewItem({ label, value }) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-gray-100 last:border-0">
      <span className="text-sm text-gray-500">{label}</span>
      <span className="text-sm font-semibold text-gray-900">{value || '—'}</span>
    </div>
  );
}

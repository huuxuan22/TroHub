import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { isApprovedLandlordAccount } from '../utils/userRoles';
import { CATEGORIES, CITIES, AMENITIES } from '../data/mockData';
import { createRoom, formatAddressWithCity, uploadRoomImage } from '../services/roomApi';
import { reverseGeocode } from '../services/geocodingApi';
import useGeolocation from '../utils/useGeolocation';

const STEPS = [
  { id: 1, label: 'Thông tin cơ bản', icon: '🧾' },
  { id: 2, label: 'Hình ảnh & Tiện ích', icon: '🖼️' },
  { id: 3, label: 'Giá & Liên hệ', icon: '💸' },
  { id: 4, label: 'Xác nhận', icon: '🎉' },
];

const MAX_IMAGES = 10;
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

function buildAddress(detail, city) {
  return formatAddressWithCity(detail || '', city || '');
}

function buildDescription(form) {
  const lines = [];
  if (form.description) lines.push(form.description.trim());
  if (form.deposit) {
    const dep = Number(form.deposit);
    if (Number.isFinite(dep) && dep > 0) {
      lines.push(`Tiền cọc: ${new Intl.NumberFormat('vi-VN').format(dep)} đ.`);
    }
  }
  const contactBits = [];
  if (form.contactName) contactBits.push(form.contactName.trim());
  if (form.contactPhone) contactBits.push(`SĐT ${form.contactPhone.trim()}`);
  if (form.contactEmail) contactBits.push(form.contactEmail.trim());
  if (contactBits.length) lines.push(`Liên hệ: ${contactBits.join(' · ')}.`);
  if (Array.isArray(form.amenities) && form.amenities.length) {
    const labels = form.amenities
      .map((id) => AMENITIES.find((a) => a.id === id)?.label)
      .filter(Boolean)
      .join(', ');
    if (labels) lines.push(`Tiện ích: ${labels}.`);
  }
  return lines.join('\n').trim();
}

function formatPriceMillion(price) {
  const n = Number(price);
  if (!Number.isFinite(n) || n <= 0) return 'Chưa nhập';
  return `${(n / 1_000_000).toFixed(1)} triệu/tháng`;
}

export default function PostRoomPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const previewObjectUrls = useRef([]);

  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    title: '', type: '', city: '', address: '', area: '',
    description: '', amenities: [], price: '', deposit: '',
    contactName: user?.full_name || '',
    contactPhone: user?.phone_number || '',
    contactEmail: user?.email || '',
    latitude: null,
    longitude: null,
  });
  const [images, setImages] = useState([]); // [{ file, previewUrl, uploadedUrl?, error? }]
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [locating, setLocating] = useState(false);
  const [locationNote, setLocationNote] = useState('');
  const { requestLocation } = useGeolocation();

  useEffect(() => {
    return () => {
      previewObjectUrls.current.forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

  const update = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const handleAddressChange = (value) => {
    setLocationNote('');
    setForm((prev) => ({ ...prev, address: value, latitude: null, longitude: null }));
  };

  const findCityFromList = (raw) => {
    if (!raw) return '';
    const lowered = String(raw).toLowerCase();
    return (
      CITIES.find((c) => lowered.includes(c.toLowerCase())) ||
      CITIES.find((c) => lowered.includes(c.toLowerCase().replace('tp. ', ''))) ||
      ''
    );
  };

  const useCurrentLocation = async () => {
    setError('');
    setLocationNote('');
    setLocating(true);
    try {
      const pos = await requestLocation();
      let reverse = null;
      try {
        reverse = await reverseGeocode(pos.latitude, pos.longitude);
      } catch {
        // Bỏ qua lỗi reverse: vẫn lưu toạ độ thô cho người dùng tự nhập địa chỉ.
      }
      const address = reverse?.address || '';
      const detectedCity = findCityFromList(reverse?.city || reverse?.display_name || address);

      setForm((prev) => ({
        ...prev,
        address: address || prev.address,
        city: detectedCity || prev.city,
        latitude: pos.latitude,
        longitude: pos.longitude,
      }));
      setLocationNote(
        address
          ? `Đã lấy vị trí (±${Math.round(pos.accuracy)} m): ${address}`
          : `Đã lấy toạ độ (±${Math.round(pos.accuracy)} m) — bạn vui lòng nhập thêm địa chỉ chi tiết.`,
      );
    } catch (err) {
      setError(err.message || 'Không lấy được vị trí hiện tại.');
    } finally {
      setLocating(false);
    }
  };

  const toggleAmenity = (id) => {
    const next = form.amenities.includes(id)
      ? form.amenities.filter((a) => a !== id)
      : [...form.amenities, id];
    update('amenities', next);
  };

  const validateStep1 = () => {
    if (!form.title.trim()) return 'Vui lòng nhập tiêu đề tin đăng.';
    if (!form.type) return 'Vui lòng chọn loại hình.';
    if (!form.city) return 'Vui lòng chọn tỉnh / thành phố.';
    if (!form.address.trim()) return 'Vui lòng nhập địa chỉ cụ thể.';
    const area = Number(form.area);
    if (!Number.isFinite(area) || area <= 0) return 'Diện tích phải là số dương.';
    return '';
  };
  const validateStep3 = () => {
    const price = Number(form.price);
    if (!Number.isFinite(price) || price <= 0) return 'Vui lòng nhập giá thuê hợp lệ.';
    if (!form.contactName.trim()) return 'Vui lòng nhập họ tên người liên hệ.';
    if (!form.contactPhone.trim()) return 'Vui lòng nhập số điện thoại liên hệ.';
    return '';
  };

  const isStepValid = (currentStep = step) => {
    if (currentStep === 1) return !validateStep1();
    if (currentStep === 3) return !validateStep3();
    if (currentStep === 4) return agreeTerms;
    return true;
  };

  const goNext = () => {
    setError('');
    if (step === 1) {
      const msg = validateStep1();
      if (msg) {
        setError(msg);
        return;
      }
    }
    if (step === 3) {
      const msg = validateStep3();
      if (msg) {
        setError(msg);
        return;
      }
    }
    if (step < STEPS.length) setStep(step + 1);
  };

  const goPrev = () => {
    setError('');
    setStep((s) => Math.max(1, s - 1));
  };

  const handleFilesSelected = async (fileList) => {
    setError('');
    const incoming = Array.from(fileList || []);
    if (!incoming.length) return;

    const remaining = MAX_IMAGES - images.length;
    if (remaining <= 0) {
      setError(`Chỉ cho phép tối đa ${MAX_IMAGES} ảnh.`);
      return;
    }
    const accepted = incoming.slice(0, remaining);

    const newItems = accepted.map((file) => {
      if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
        return { file, error: 'Loại file không hỗ trợ (chỉ JPG/PNG/WebP/GIF).' };
      }
      if (file.size > MAX_IMAGE_SIZE) {
        return { file, error: 'File vượt 5MB.' };
      }
      const previewUrl = URL.createObjectURL(file);
      previewObjectUrls.current.push(previewUrl);
      return { file, previewUrl, uploading: true };
    });

    const startIdx = images.length;
    setImages((prev) => [...prev, ...newItems]);

    await Promise.all(
      newItems.map(async (item, i) => {
        const targetIdx = startIdx + i;
        if (item.error) return;
        try {
          const url = await uploadRoomImage(item.file);
          setImages((prev) => {
            const next = [...prev];
            if (next[targetIdx]) next[targetIdx] = { ...next[targetIdx], uploadedUrl: url, uploading: false };
            return next;
          });
        } catch (err) {
          setImages((prev) => {
            const next = [...prev];
            if (next[targetIdx]) {
              next[targetIdx] = { ...next[targetIdx], uploading: false, error: err.message || 'Upload thất bại' };
            }
            return next;
          });
        }
      }),
    );
  };

  const removeImage = (index) => {
    setImages((prev) => {
      const next = [...prev];
      const removed = next.splice(index, 1)[0];
      if (removed?.previewUrl) {
        try {
          URL.revokeObjectURL(removed.previewUrl);
        } catch {
          /* ignore */
        }
      }
      return next;
    });
  };

  const submit = async () => {
    setError('');
    setSuccess('');

    const m1 = validateStep1();
    if (m1) {
      setError(m1);
      setStep(1);
      return;
    }
    const m3 = validateStep3();
    if (m3) {
      setError(m3);
      setStep(3);
      return;
    }
    if (!agreeTerms) {
      setError('Vui lòng đồng ý với điều khoản trước khi đăng tin.');
      return;
    }
    if (images.some((img) => img.uploading)) {
      setError('Vẫn còn ảnh đang upload, vui lòng đợi trong giây lát.');
      return;
    }

    const imageUrls = images.map((img) => img.uploadedUrl).filter(Boolean);

    const payload = {
      title: form.title.trim(),
      room_type: form.type,
      description: buildDescription(form) || null,
      price: Number(form.price),
      area_sqm: Number(form.area),
      address: buildAddress(form.address, form.city),
      status: 'available',
      source: 'owner',
      image_urls: imageUrls,
    };

    if (Number.isFinite(form.latitude) && Number.isFinite(form.longitude)) {
      payload.latitude = Number(form.latitude);
      payload.longitude = Number(form.longitude);
    }

    setSubmitting(true);
    try {
      const room = await createRoom(payload);
      setSuccess('🎉 Đăng tin thành công! Đang chuyển đến trang quản lý tin...');
      setTimeout(() => {
        if (room?.id) {
          navigate(`/room/${room.id}`, { replace: true });
        } else {
          navigate('/manage-rooms', { replace: true });
        }
      }, 1200);
    } catch (err) {
      setError(err.message || 'Đăng tin thất bại');
    } finally {
      setSubmitting(false);
    }
  };

  const onSubmit = (e) => {
    e.preventDefault();
    if (step < STEPS.length) {
      goNext();
    } else {
      submit();
    }
  };

  const stepProgress = ((step - 1) / (STEPS.length - 1)) * 100;
  const hasUploadingImage = images.some((img) => img.uploading);

  return (
    <div className="min-h-screen bg-slate-50 pt-20">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center mb-8">
          {isApprovedLandlordAccount(user) && (
            <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 text-left max-w-xl mx-auto">
              Tài khoản chủ nhà của bạn đã được duyệt — bạn có thể đăng tin cho thuê. Chỉ những tài khoản đã duyệt mới
              vào được trang này và gửi tin lên hệ thống.
            </div>
          )}
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Đăng tin cho thuê</h1>
          <p className="text-gray-500">Tiếp cận hàng nghìn người thuê trọ tiềm năng</p>
        </div>

        <div className="flex items-center justify-between mb-8 relative">
          <div className="absolute top-5 left-0 right-0 h-0.5 bg-gray-200 z-0">
            <div
              className="h-full bg-blue-600 transition-all duration-500"
              style={{ width: `${stepProgress}%` }}
            />
          </div>
          {STEPS.map((s) => (
            <div key={s.id} className="relative z-10 flex flex-col items-center gap-2">
              <button
                type="button"
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

        {error && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 text-red-700 text-sm px-4 py-3">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-700 text-sm px-4 py-3">
            {success}
          </div>
        )}

        <form onSubmit={onSubmit}>
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
                  <div className="flex gap-2">
                    <input
                      value={form.address}
                      onChange={(e) => handleAddressChange(e.target.value)}
                      placeholder="Số nhà, đường, phường/xã, quận/huyện"
                      className={`${inputCls} flex-1`}
                      required
                    />
                    <button
                      type="button"
                      onClick={useCurrentLocation}
                      disabled={locating}
                      className="inline-flex items-center gap-1.5 shrink-0 px-3.5 rounded-xl border border-blue-200 bg-blue-50 text-blue-700 text-sm font-semibold hover:bg-blue-100 disabled:opacity-60"
                      title="Dùng định vị GPS để tự điền địa chỉ và lưu toạ độ chính xác"
                    >
                      {locating ? '⏳ Đang lấy...' : '📍 Vị trí hiện tại'}
                    </button>
                  </div>
                  {locationNote && (
                    <p className="mt-2 text-xs text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2">
                      {locationNote}
                    </p>
                  )}
                  {form.latitude != null && form.longitude != null && (
                    <p className="mt-1 text-[11px] text-slate-400">
                      Toạ độ đã lưu: {Number(form.latitude).toFixed(6)}, {Number(form.longitude).toFixed(6)}
                    </p>
                  )}
                </FormField>

                <FormField label="Diện tích (m²) *">
                  <input
                    type="number"
                    value={form.area}
                    onChange={(e) => update('area', e.target.value)}
                    placeholder="VD: 25"
                    className={inputCls}
                    min="1"
                    step="0.1"
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

                <FormField label={`Hình ảnh phòng (${images.length}/${MAX_IMAGES})`}>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept={ALLOWED_IMAGE_TYPES.join(',')}
                    multiple
                    hidden
                    onChange={(e) => {
                      handleFilesSelected(e.target.files);
                      if (e.target) e.target.value = '';
                    }}
                  />
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      handleFilesSelected(e.dataTransfer.files);
                    }}
                    role="button"
                    tabIndex={0}
                    className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center hover:border-blue-300 hover:bg-blue-50 transition-all cursor-pointer group"
                  >
                    <div className="text-4xl mb-2">🖼️</div>
                    <p className="font-medium text-gray-700 group-hover:text-blue-600">
                      Kéo thả hoặc nhấn để tải ảnh
                    </p>
                    <p className="text-sm text-gray-400 mt-1">PNG, JPG, WebP, GIF · tối đa 5MB · tối đa {MAX_IMAGES} ảnh</p>
                  </div>

                  {images.length > 0 && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-4">
                      {images.map((img, idx) => (
                        <div key={idx} className="relative group rounded-xl overflow-hidden border border-gray-200 bg-white">
                          {img.previewUrl ? (
                            <img src={img.previewUrl} alt="" className="w-full h-32 object-cover" />
                          ) : (
                            <div className="w-full h-32 bg-gray-100 flex items-center justify-center text-3xl">📷</div>
                          )}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                          <button
                            type="button"
                            onClick={() => removeImage(idx)}
                            className="absolute top-2 right-2 w-7 h-7 rounded-full bg-white/90 text-red-600 text-sm font-bold hover:bg-white shadow-sm"
                            title="Xoá"
                          >
                            ×
                          </button>
                          <div className="absolute bottom-2 left-2 right-2 text-xs text-white truncate">
                            {img.uploading && <span>⏳ Đang upload...</span>}
                            {!img.uploading && img.uploadedUrl && <span>✓ Sẵn sàng</span>}
                            {img.error && <span className="text-red-200">{img.error}</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </FormField>

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

                <div className="space-y-1.5">
                  <ReviewItem label="Tiêu đề" value={form.title} />
                  <ReviewItem label="Loại hình" value={form.type} />
                  <ReviewItem label="Địa chỉ" value={buildAddress(form.address, form.city)} />
                  <ReviewItem label="Diện tích" value={form.area ? `${form.area} m²` : '—'} />
                  <ReviewItem label="Giá thuê" value={formatPriceMillion(form.price)} />
                  <ReviewItem
                    label="Tiền cọc"
                    value={form.deposit ? `${new Intl.NumberFormat('vi-VN').format(Number(form.deposit))} đ` : '—'}
                  />
                  <ReviewItem
                    label="Liên hệ"
                    value={`${form.contactName || '—'} · ${form.contactPhone || '—'}`}
                  />
                  <ReviewItem
                    label="Ảnh"
                    value={`${images.filter((img) => img.uploadedUrl).length}/${images.length} ảnh sẵn sàng`}
                  />
                  <ReviewItem
                    label="Tiện ích"
                    value={
                      form.amenities.length
                        ? form.amenities
                            .map((id) => AMENITIES.find((a) => a.id === id)?.label)
                            .filter(Boolean)
                            .join(', ')
                        : '—'
                    }
                  />
                </div>

                <div className="p-4 bg-blue-50 rounded-xl border border-blue-100 text-sm text-blue-800">
                  <p className="font-semibold mb-1">Sau khi gửi:</p>
                  <ul className="list-disc pl-5 space-y-0.5 text-blue-700">
                    <li>Tin được lưu với trạng thái <strong>Đang hiển thị</strong>.</li>
                    <li>Bạn có thể chỉnh sửa / ẩn / xoá trong trang <em>Quản lý phòng</em>.</li>
                    <li>Admin có thể ẩn tin nếu phát hiện vi phạm.</li>
                  </ul>
                </div>

                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    id="terms"
                    checked={agreeTerms}
                    onChange={(e) => setAgreeTerms(e.target.checked)}
                    className="mt-0.5 accent-blue-600"
                  />
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

          <div className="flex items-center justify-between mt-6">
            <button
              type="button"
              onClick={goPrev}
              disabled={step === 1 || submitting}
              className="flex items-center gap-2 px-6 py-3 border border-gray-200 text-gray-600 rounded-xl font-medium hover:bg-gray-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              ← Quay lại
            </button>

            <div className="flex items-center gap-2 text-sm text-gray-400">
              {step}/{STEPS.length}
            </div>

            {step < STEPS.length ? (
              <button
                type="submit"
                disabled={!isStepValid(step) || submitting}
                className="flex items-center gap-2 px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Tiếp theo →
              </button>
            ) : (
              <button
                type="submit"
                disabled={!agreeTerms || submitting || hasUploadingImage}
                className="flex items-center gap-2 px-8 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {submitting ? '⏳ Đang đăng...' : hasUploadingImage ? '⏳ Đang upload ảnh...' : '✅ Đăng tin ngay'}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}

const inputCls =
  'w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white transition-all';

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
    <div className="flex items-start justify-between gap-3 py-2.5 border-b border-gray-100 last:border-0">
      <span className="text-sm text-gray-500 shrink-0">{label}</span>
      <span className="text-sm font-semibold text-gray-900 text-right">{value || '—'}</span>
    </div>
  );
}

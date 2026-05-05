import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { MOCK_ROOMS } from '../data/mockData';

const PRIMARY = '#2563EB';
const PRIMARY_ALT = '#3B82F6';
const BACKGROUND = '#F8FAFC';
const TEXT = '#1E293B';

const STATUS_OPTIONS = [
  { value: 'available', label: 'Còn phòng' },
  { value: 'occupied', label: 'Đã thuê' },
  { value: 'maintenance', label: 'Bảo trì' },
];

function toStatusLabel(status) {
  return STATUS_OPTIONS.find((s) => s.value === status)?.label || 'Còn phòng';
}

function getStatusStyle(status) {
  if (status === 'occupied') return 'bg-red-100 text-red-700';
  if (status === 'maintenance') return 'bg-amber-100 text-amber-700';
  return 'bg-emerald-100 text-emerald-700';
}

function formatPrice(price) {
  return new Intl.NumberFormat('vi-VN').format(price || 0);
}

function normalizeRoom(room) {
  return {
    id: room.id,
    title: room.title,
    address: room.address,
    city: room.city,
    price: room.price,
    area: room.area,
    status: room.status || 'available',
    image: room.images?.[0] || '',
  };
}

function emptyForm() {
  return {
    title: '',
    address: '',
    city: '',
    price: '',
    area: '',
    status: 'available',
    image: '',
  };
}

export default function ManageRoomsPage() {
  const [rooms, setRooms] = useState(MOCK_ROOMS.map(normalizeRoom));
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm());

  const titleText = editingId ? 'Cập nhật phòng trọ' : 'Thêm phòng trọ mới';
  const submitText = editingId ? 'Lưu thay đổi' : 'Thêm phòng';
  const roomCountText = useMemo(() => `${rooms.length} phòng`, [rooms.length]);

  const update = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const resetForm = () => {
    setEditingId(null);
    setForm(emptyForm());
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = {
      ...form,
      price: Number(form.price),
      area: Number(form.area),
    };

    if (editingId) {
      setRooms((prev) => prev.map((room) => (room.id === editingId ? { ...room, ...payload } : room)));
      resetForm();
      return;
    }

    const nextId = rooms.reduce((max, room) => Math.max(max, room.id), 0) + 1;
    setRooms((prev) => [{ id: nextId, ...payload }, ...prev]);
    resetForm();
  };

  const handleEdit = (room) => {
    setEditingId(room.id);
    setForm({
      title: room.title,
      address: room.address,
      city: room.city,
      price: String(room.price),
      area: String(room.area),
      status: room.status,
      image: room.image,
    });
  };

  const handleDelete = (id) => {
    setRooms((prev) => prev.filter((room) => room.id !== id));
    if (editingId === id) resetForm();
  };

  return (
    <div className="min-h-screen pt-16" style={{ backgroundColor: BACKGROUND, color: TEXT }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div>
            <p className="text-sm font-semibold" style={{ color: PRIMARY }}>Quản trị nhà trọ</p>
            <h1 className="text-2xl font-bold" style={{ color: TEXT }}>Quản lý phòng trọ</h1>
            <p className="text-sm text-slate-500 mt-1">Thêm, sửa, xóa phòng và cập nhật ảnh, diện tích, trạng thái.</p>
          </div>
          <Link
            to="/post"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-medium transition-colors"
            style={{ backgroundColor: PRIMARY }}
          >
            + Đăng tin nâng cao
          </Link>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold" style={{ color: TEXT }}>Danh sách phòng trọ</h2>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700">{roomCountText}</span>
              </div>

              <div className="space-y-3">
                {rooms.map((room) => (
                  <div key={room.id} className="rounded-xl border border-slate-200 p-3 sm:p-4">
                    <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                      <img
                        src={room.image || 'https://images.unsplash.com/photo-1484154218962-a197022b5858?w=600&q=80'}
                        alt={room.title}
                        className="w-full sm:w-36 h-24 object-cover rounded-lg bg-slate-100"
                      />
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <h3 className="font-semibold text-base" style={{ color: TEXT }}>{room.title}</h3>
                          <span className={`text-xs px-2 py-1 rounded-full font-medium ${getStatusStyle(room.status)}`}>
                            {toStatusLabel(room.status)}
                          </span>
                        </div>
                        <p className="text-sm text-slate-500 mb-2">{room.address}, {room.city}</p>
                        <div className="flex flex-wrap gap-4 text-sm text-slate-600">
                          <span>Diện tích: <strong>{room.area} m²</strong></span>
                          <span>Giá: <strong>{formatPrice(room.price)} đ/tháng</strong></span>
                        </div>
                      </div>
                      <div className="flex sm:flex-col gap-2 sm:w-28">
                        <button
                          type="button"
                          onClick={() => handleEdit(room)}
                          className="flex-1 px-3 py-2 rounded-lg text-sm font-medium text-white transition-colors"
                          style={{ backgroundColor: PRIMARY_ALT }}
                        >
                          Sửa
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(room.id)}
                          className="flex-1 px-3 py-2 rounded-lg text-sm font-medium border border-red-200 text-red-600 hover:bg-red-50 transition-colors"
                        >
                          Xóa
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-5 h-fit lg:sticky lg:top-20">
            <h2 className="text-lg font-semibold mb-4" style={{ color: TEXT }}>{titleText}</h2>
            <form onSubmit={handleSubmit} className="space-y-3.5">
              <Field label="Tên phòng">
                <input
                  required
                  value={form.title}
                  onChange={(e) => update('title', e.target.value)}
                  className={inputCls}
                  placeholder="VD: Phòng full nội thất gần ĐH Bách Khoa"
                />
              </Field>

              <Field label="Ảnh phòng (URL)">
                <input
                  required
                  value={form.image}
                  onChange={(e) => update('image', e.target.value)}
                  className={inputCls}
                  placeholder="https://..."
                />
              </Field>

              <Field label="Địa chỉ">
                <input
                  required
                  value={form.address}
                  onChange={(e) => update('address', e.target.value)}
                  className={inputCls}
                  placeholder="Số nhà, đường..."
                />
              </Field>

              <Field label="Thành phố">
                <input
                  required
                  value={form.city}
                  onChange={(e) => update('city', e.target.value)}
                  className={inputCls}
                  placeholder="Hà Nội / TP. Hồ Chí Minh..."
                />
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Diện tích (m²)">
                  <input
                    type="number"
                    min="1"
                    required
                    value={form.area}
                    onChange={(e) => update('area', e.target.value)}
                    className={inputCls}
                    placeholder="25"
                  />
                </Field>
                <Field label="Giá (VNĐ/tháng)">
                  <input
                    type="number"
                    min="0"
                    required
                    value={form.price}
                    onChange={(e) => update('price', e.target.value)}
                    className={inputCls}
                    placeholder="3000000"
                  />
                </Field>
              </div>

              <Field label="Trạng thái">
                <select value={form.status} onChange={(e) => update('status', e.target.value)} className={inputCls}>
                  {STATUS_OPTIONS.map((status) => (
                    <option key={status.value} value={status.value}>{status.label}</option>
                  ))}
                </select>
              </Field>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2.5 rounded-xl text-white font-semibold text-sm transition-colors"
                  style={{ backgroundColor: PRIMARY }}
                >
                  {submitText}
                </button>
                {editingId && (
                  <button
                    type="button"
                    onClick={resetForm}
                    className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50"
                  >
                    Hủy
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1.5">{label}</label>
      {children}
    </div>
  );
}

const inputCls = 'w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent';

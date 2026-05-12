import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  addRoomImage,
  deleteRoom,
  deleteRoomImage,
  fetchMyRooms,
  updateRoom,
  uploadRoomImage,
} from '../services/roomApi';

const PRIMARY = '#2563EB';
const BACKGROUND = '#F8FAFC';
const TEXT = '#1E293B';

const ROOM_TYPE_OPTIONS = ['Phòng trọ', 'Căn hộ mini', 'Nhà nguyên căn', 'Căn hộ chung cư', 'Phòng ở ghép'];

const STATUS_OPTIONS = [
  { value: 'available', label: 'Đang hiển thị', dot: 'bg-emerald-500', badge: 'bg-emerald-100 text-emerald-700' },
  { value: 'hidden', label: 'Đã ẩn', dot: 'bg-amber-500', badge: 'bg-amber-100 text-amber-700' },
  { value: 'rented', label: 'Đã cho thuê', dot: 'bg-sky-500', badge: 'bg-sky-100 text-sky-700' },
  { value: 'draft', label: 'Bản nháp', dot: 'bg-slate-400', badge: 'bg-slate-200 text-slate-700' },
  { value: 'expired', label: 'Hết hạn', dot: 'bg-rose-500', badge: 'bg-rose-100 text-rose-700' },
];

const STATUS_MAP = STATUS_OPTIONS.reduce((acc, item) => {
  acc[item.value] = item;
  return acc;
}, {});

const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1484154218962-a197022b5858?w=600&q=80';

const FILTERS = [
  { value: 'all', label: 'Tất cả' },
  { value: 'available', label: 'Đang hiển thị' },
  { value: 'hidden', label: 'Đã ẩn' },
  { value: 'rented', label: 'Đã cho thuê' },
  { value: 'draft', label: 'Bản nháp' },
  { value: 'expired', label: 'Hết hạn' },
];

function formatPrice(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return '—';
  return `${new Intl.NumberFormat('vi-VN').format(n)} đ/tháng`;
}

function formatDate(value) {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch {
    return '—';
  }
}

function getFirstImage(room) {
  if (!room?.images?.length) return FALLBACK_IMAGE;
  const first = room.images[0];
  if (typeof first === 'string') return first;
  return first?.image_url || FALLBACK_IMAGE;
}

function StatusBadge({ status }) {
  const meta = STATUS_MAP[status] || STATUS_MAP.draft;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${meta.badge}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
      {meta.label}
    </span>
  );
}

function StatCard({ label, value, accent }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4">
      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</p>
      <p className="text-2xl font-bold mt-1" style={{ color: accent || TEXT }}>{value}</p>
    </div>
  );
}

function Toast({ toast, onClose }) {
  if (!toast) return null;
  const isError = toast.type === 'error';
  return (
    <div className="fixed top-20 right-4 z-50">
      <div
        className={`px-4 py-3 rounded-xl shadow-lg border text-sm font-medium flex items-center gap-3 ${
          isError ? 'bg-rose-50 border-rose-200 text-rose-700' : 'bg-emerald-50 border-emerald-200 text-emerald-700'
        }`}
      >
        <span>{toast.message}</span>
        <button onClick={onClose} className="ml-2 text-slate-500 hover:text-slate-700">✕</button>
      </div>
    </div>
  );
}

export default function ManageRoomsPage() {
  const { user } = useAuth();
  const landlordId = user?.id;

  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [keyword, setKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [busyId, setBusyId] = useState(null);
  const [toast, setToast] = useState(null);

  const [editingRoom, setEditingRoom] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const showToast = useCallback((type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3500);
  }, []);

  const loadRooms = useCallback(async () => {
    if (!landlordId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await fetchMyRooms({ landlordId });
      setRooms(data);
    } catch (err) {
      setError(err.message || 'Không tải được danh sách phòng.');
    } finally {
      setLoading(false);
    }
  }, [landlordId]);

  useEffect(() => {
    loadRooms();
  }, [loadRooms]);

  const stats = useMemo(() => {
    const acc = { total: rooms.length, available: 0, hidden: 0, rented: 0, draft: 0, expired: 0 };
    rooms.forEach((r) => {
      if (acc[r.status] !== undefined) acc[r.status] += 1;
    });
    return acc;
  }, [rooms]);

  const filteredRooms = useMemo(() => {
    const kw = keyword.trim().toLowerCase();
    return rooms.filter((r) => {
      if (statusFilter !== 'all' && r.status !== statusFilter) return false;
      if (!kw) return true;
      const hay = `${r.title || ''} ${r.address || ''}`.toLowerCase();
      return hay.includes(kw);
    });
  }, [rooms, keyword, statusFilter]);

  const handleQuickStatusChange = async (room, newStatus) => {
    if (room.status === newStatus) return;
    setBusyId(room.id);
    try {
      const updated = await updateRoom(room.id, { status: newStatus });
      setRooms((prev) => prev.map((r) => (r.id === room.id ? { ...r, ...updated } : r)));
      showToast('success', `Đã chuyển sang "${STATUS_MAP[newStatus]?.label || newStatus}".`);
    } catch (err) {
      showToast('error', err.message || 'Đổi trạng thái thất bại.');
    } finally {
      setBusyId(null);
    }
  };

  const handleDeleteConfirmed = async () => {
    if (!confirmDelete) return;
    const room = confirmDelete;
    setBusyId(room.id);
    try {
      await deleteRoom(room.id);
      setRooms((prev) => prev.filter((r) => r.id !== room.id));
      showToast('success', 'Đã xoá tin đăng.');
      setConfirmDelete(null);
    } catch (err) {
      showToast('error', err.message || 'Xoá thất bại.');
    } finally {
      setBusyId(null);
    }
  };

  const handleEditSaved = (updated) => {
    setRooms((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
    showToast('success', 'Đã lưu thay đổi.');
  };

  if (!landlordId) {
    return (
      <div className="min-h-screen pt-24 flex items-center justify-center" style={{ backgroundColor: BACKGROUND }}>
        <p className="text-slate-600">Vui lòng đăng nhập để quản lý phòng.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-16" style={{ backgroundColor: BACKGROUND, color: TEXT }}>
      <Toast toast={toast} onClose={() => setToast(null)} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div>
            <p className="text-sm font-semibold" style={{ color: PRIMARY }}>Khu vực chủ phòng</p>
            <h1 className="text-2xl sm:text-3xl font-bold mt-1">Quản lý tin đăng phòng</h1>
            <p className="text-sm text-slate-500 mt-1">
              Theo dõi, chỉnh sửa, ẩn/hiện và xoá các tin đăng của bạn.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={loadRooms}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-300 text-slate-700 text-sm font-medium hover:bg-slate-50"
            >
              🔄 Làm mới
            </button>
            <Link
              to="/post"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-medium hover:opacity-95"
              style={{ backgroundColor: PRIMARY }}
            >
              + Đăng tin mới
            </Link>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
          <StatCard label="Tổng tin" value={stats.total} accent={PRIMARY} />
          <StatCard label="Đang hiển thị" value={stats.available} accent="#059669" />
          <StatCard label="Đã ẩn" value={stats.hidden} accent="#D97706" />
          <StatCard label="Đã cho thuê" value={stats.rented} accent="#0284C7" />
          <StatCard label="Bản nháp / Hết hạn" value={stats.draft + stats.expired} accent="#64748B" />
        </div>

        {/* Toolbar */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 mb-4">
          <div className="flex flex-col lg:flex-row lg:items-center gap-3">
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
              <input
                type="search"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="Tìm theo tiêu đề hoặc địa chỉ..."
                className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 text-sm"
              />
            </div>
            <div className="flex items-center gap-2 overflow-x-auto">
              {FILTERS.map((f) => {
                const active = statusFilter === f.value;
                return (
                  <button
                    key={f.value}
                    type="button"
                    onClick={() => setStatusFilter(f.value)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap border ${
                      active
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    {f.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Body */}
        {loading ? (
          <div className="grid gap-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-2xl border border-slate-200 p-4 animate-pulse h-32" />
            ))}
          </div>
        ) : error ? (
          <div className="bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl p-6 text-center">
            <p className="font-medium mb-2">{error}</p>
            <button
              type="button"
              onClick={loadRooms}
              className="px-4 py-2 rounded-lg bg-rose-600 text-white text-sm font-medium"
            >
              Thử lại
            </button>
          </div>
        ) : filteredRooms.length === 0 ? (
          <EmptyState hasRooms={rooms.length > 0} onClear={() => { setKeyword(''); setStatusFilter('all'); }} />
        ) : (
          <div className="space-y-3">
            {filteredRooms.map((room) => (
              <RoomRow
                key={room.id}
                room={room}
                busy={busyId === room.id}
                onEdit={() => setEditingRoom(room)}
                onDelete={() => setConfirmDelete(room)}
                onChangeStatus={(s) => handleQuickStatusChange(room, s)}
              />
            ))}
          </div>
        )}
      </div>

      {editingRoom ? (
        <EditRoomModal
          room={editingRoom}
          onClose={() => setEditingRoom(null)}
          onSaved={(updated) => {
            handleEditSaved(updated);
            setEditingRoom(updated);
          }}
          onCloseAfterSave={() => setEditingRoom(null)}
          showToast={showToast}
        />
      ) : null}

      {confirmDelete ? (
        <ConfirmDeleteModal
          room={confirmDelete}
          loading={busyId === confirmDelete.id}
          onCancel={() => setConfirmDelete(null)}
          onConfirm={handleDeleteConfirmed}
        />
      ) : null}
    </div>
  );
}

function EmptyState({ hasRooms, onClear }) {
  return (
    <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center">
      <div className="text-5xl mb-3">🏠</div>
      <h3 className="text-lg font-semibold mb-1">
        {hasRooms ? 'Không có tin nào khớp bộ lọc' : 'Bạn chưa có tin đăng nào'}
      </h3>
      <p className="text-sm text-slate-500 mb-4">
        {hasRooms
          ? 'Thử thay đổi từ khoá hoặc bộ lọc trạng thái.'
          : 'Hãy tạo tin đăng đầu tiên để khách thuê có thể tìm thấy phòng của bạn.'}
      </p>
      <div className="flex items-center justify-center gap-2">
        {hasRooms ? (
          <button
            type="button"
            onClick={onClear}
            className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 text-sm font-medium hover:bg-slate-50"
          >
            Xoá bộ lọc
          </button>
        ) : null}
        <Link
          to="/post"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-medium"
          style={{ backgroundColor: PRIMARY }}
        >
          + Đăng tin mới
        </Link>
      </div>
    </div>
  );
}

function RoomRow({ room, busy, onEdit, onDelete, onChangeStatus }) {
  const imageCount = room.images?.length || 0;
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-3 sm:p-4">
      <div className="flex flex-col sm:flex-row sm:items-start gap-4">
        <div className="relative w-full sm:w-44 h-32 rounded-xl overflow-hidden bg-slate-100 shrink-0">
          <img
            src={getFirstImage(room)}
            alt={room.title}
            className="w-full h-full object-cover"
            onError={(e) => { e.currentTarget.src = FALLBACK_IMAGE; }}
          />
          <span className="absolute bottom-1.5 right-1.5 text-xs px-1.5 py-0.5 rounded-md bg-black/60 text-white">
            📷 {imageCount}
          </span>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <h3 className="font-semibold text-base truncate">{room.title}</h3>
            <StatusBadge status={room.status} />
          </div>
          <p className="text-sm text-slate-500 mb-2 truncate">📍 {room.address || 'Chưa có địa chỉ'}</p>
          <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-slate-600">
            <span>🏷 <strong>{room.room_type || 'Phòng trọ'}</strong></span>
            <span>📐 <strong>{room.area_sqm ? `${room.area_sqm} m²` : '—'}</strong></span>
            <span>💰 <strong>{formatPrice(room.price)}</strong></span>
            <span className="text-slate-500">Đăng: {formatDate(room.created_at)}</span>
          </div>
        </div>

        <div className="flex flex-col gap-2 sm:items-end min-w-[12rem]">
          <div className="flex items-center gap-1.5">
            <select
              value={room.status || 'draft'}
              onChange={(e) => onChangeStatus(e.target.value)}
              disabled={busy}
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 disabled:opacity-60"
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-1.5">
            <Link
              to={`/rooms/${room.id}`}
              target="_blank"
              rel="noreferrer"
              className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-700 text-sm hover:bg-slate-50"
              title="Xem tin"
            >
              👁
            </Link>
            <button
              type="button"
              onClick={onEdit}
              disabled={busy}
              className="px-3 py-1.5 rounded-lg border border-blue-200 text-blue-700 text-sm hover:bg-blue-50 disabled:opacity-60"
              title="Sửa tin"
            >
              ✏️ Sửa
            </button>
            <button
              type="button"
              onClick={onDelete}
              disabled={busy}
              className="px-3 py-1.5 rounded-lg border border-rose-200 text-rose-700 text-sm hover:bg-rose-50 disabled:opacity-60"
              title="Xoá tin"
            >
              🗑
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ConfirmDeleteModal({ room, loading, onCancel, onConfirm }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl">
        <h3 className="text-lg font-semibold">Xoá tin đăng?</h3>
        <p className="text-sm text-slate-600 mt-2">
          Tin <strong>"{room.title}"</strong> và toàn bộ ảnh kèm theo sẽ bị xoá vĩnh viễn. Hành động này không thể hoàn tác.
        </p>
        <div className="flex items-center justify-end gap-2 mt-5">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 text-sm font-medium hover:bg-slate-50 disabled:opacity-60"
          >
            Huỷ
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="px-4 py-2 rounded-lg bg-rose-600 text-white text-sm font-medium hover:bg-rose-700 disabled:opacity-60"
          >
            {loading ? 'Đang xoá...' : 'Xoá vĩnh viễn'}
          </button>
        </div>
      </div>
    </div>
  );
}

function EditRoomModal({ room, onClose, onSaved, onCloseAfterSave, showToast }) {
  const [tab, setTab] = useState('info');
  const [form, setForm] = useState(() => ({
    title: room.title || '',
    room_type: room.room_type || 'Phòng trọ',
    description: room.description || '',
    price: room.price != null ? String(room.price) : '',
    area_sqm: room.area_sqm != null ? String(room.area_sqm) : '',
    address: room.address || '',
    status: room.status || 'draft',
  }));
  const [images, setImages] = useState(() => Array.isArray(room.images) ? room.images : []);
  const [saving, setSaving] = useState(false);
  const [imageBusy, setImageBusy] = useState(false);
  const [fieldError, setFieldError] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    setImages(Array.isArray(room.images) ? room.images : []);
  }, [room.images]);

  const update = (k, v) => setForm((prev) => ({ ...prev, [k]: v }));

  const handleSave = async () => {
    setFieldError(null);
    const priceNum = Number(form.price);
    if (!form.title.trim()) return setFieldError('Tiêu đề không được để trống.');
    if (!form.address.trim()) return setFieldError('Địa chỉ không được để trống.');
    if (!Number.isFinite(priceNum) || priceNum <= 0) return setFieldError('Giá thuê phải là số dương.');

    const payload = {
      title: form.title.trim(),
      room_type: form.room_type,
      description: form.description?.trim() || null,
      price: priceNum,
      area_sqm: form.area_sqm ? Number(form.area_sqm) : null,
      address: form.address.trim(),
      status: form.status,
    };

    setSaving(true);
    try {
      const updated = await updateRoom(room.id, payload);
      onSaved({ ...updated, images });
    } catch (err) {
      setFieldError(err.message || 'Lưu thất bại.');
    } finally {
      setSaving(false);
    }
  };

  const handleAddImage = async (file) => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      showToast('error', 'Ảnh tối đa 5MB.');
      return;
    }
    setImageBusy(true);
    try {
      const url = await uploadRoomImage(file);
      const created = await addRoomImage(room.id, url);
      setImages((prev) => [...prev, created]);
      showToast('success', 'Đã thêm ảnh mới.');
    } catch (err) {
      showToast('error', err.message || 'Thêm ảnh thất bại.');
    } finally {
      setImageBusy(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemoveImage = async (image) => {
    if (!window.confirm('Xoá ảnh này khỏi tin đăng?')) return;
    setImageBusy(true);
    try {
      await deleteRoomImage(room.id, image.id);
      setImages((prev) => prev.filter((i) => i.id !== image.id));
      showToast('success', 'Đã xoá ảnh.');
    } catch (err) {
      showToast('error', err.message || 'Xoá ảnh thất bại.');
    } finally {
      setImageBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <div>
            <h3 className="text-lg font-semibold">Chỉnh sửa tin đăng</h3>
            <p className="text-xs text-slate-500 mt-0.5">#{room.id} • {room.title}</p>
          </div>
          <button onClick={onCloseAfterSave || onClose} className="text-slate-500 hover:text-slate-700 text-xl">✕</button>
        </div>

        <div className="px-6 pt-3 border-b border-slate-200">
          <div className="flex items-center gap-1">
            {[
              { id: 'info', label: 'Thông tin' },
              { id: 'images', label: `Ảnh (${images.length})` },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
                  tab === t.id ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {tab === 'info' ? (
            <div className="space-y-4">
              {fieldError ? (
                <div className="bg-rose-50 border border-rose-200 text-rose-700 px-3 py-2 rounded-lg text-sm">
                  {fieldError}
                </div>
              ) : null}

              <div>
                <label className="block text-sm font-medium mb-1">Tiêu đề *</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => update('title', e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Loại hình</label>
                  <select
                    value={form.room_type}
                    onChange={(e) => update('room_type', e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none"
                  >
                    {ROOM_TYPE_OPTIONS.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Trạng thái</label>
                  <select
                    value={form.status}
                    onChange={(e) => update('status', e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none"
                  >
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Giá (đ/tháng) *</label>
                  <input
                    type="number"
                    min="0"
                    value={form.price}
                    onChange={(e) => update('price', e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Diện tích (m²)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    value={form.area_sqm}
                    onChange={(e) => update('area_sqm', e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Địa chỉ *</label>
                <input
                  type="text"
                  value={form.address}
                  onChange={(e) => update('address', e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Mô tả</label>
                <textarea
                  rows={4}
                  value={form.description}
                  onChange={(e) => update('description', e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 resize-none"
                />
              </div>
            </div>
          ) : (
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm text-slate-600">
                  Tổng cộng <strong>{images.length}</strong> ảnh. Ảnh đầu tiên sẽ được dùng làm ảnh bìa.
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleAddImage(e.target.files?.[0])}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={imageBusy}
                  className="px-3 py-1.5 rounded-lg text-white text-sm font-medium hover:opacity-95 disabled:opacity-60"
                  style={{ backgroundColor: PRIMARY }}
                >
                  {imageBusy ? 'Đang xử lý...' : '+ Thêm ảnh'}
                </button>
              </div>

              {images.length === 0 ? (
                <div className="border border-dashed border-slate-300 rounded-xl p-10 text-center text-slate-500">
                  Chưa có ảnh nào. Nhấn "Thêm ảnh" để tải lên.
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {images.map((img, idx) => (
                    <div key={img.id || img.image_url} className="relative group rounded-xl overflow-hidden border border-slate-200 aspect-[4/3] bg-slate-100">
                      <img
                        src={img.image_url}
                        alt={`Ảnh ${idx + 1}`}
                        className="w-full h-full object-cover"
                        onError={(e) => { e.currentTarget.src = FALLBACK_IMAGE; }}
                      />
                      {idx === 0 ? (
                        <span className="absolute top-1.5 left-1.5 text-[10px] px-1.5 py-0.5 rounded-md bg-blue-600 text-white font-medium">
                          Ảnh bìa
                        </span>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => handleRemoveImage(img)}
                        disabled={imageBusy}
                        className="absolute top-1.5 right-1.5 h-7 w-7 rounded-full bg-white/90 text-rose-600 text-sm font-bold opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-60"
                        title="Xoá ảnh"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-slate-200 bg-slate-50 rounded-b-2xl">
          <button
            type="button"
            onClick={onCloseAfterSave || onClose}
            className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 text-sm font-medium hover:bg-white"
          >
            Đóng
          </button>
          {tab === 'info' ? (
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="px-5 py-2 rounded-lg text-white text-sm font-medium disabled:opacity-60"
              style={{ backgroundColor: PRIMARY }}
            >
              {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

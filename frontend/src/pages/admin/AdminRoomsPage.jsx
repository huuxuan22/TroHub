import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { deleteRoom, fetchAdminRooms, updateRoomStatus } from '../../services/adminApi';

const STATUS_OPTIONS = [
  { value: '', label: 'Tất cả trạng thái' },
  { value: 'draft', label: 'Nháp' },
  { value: 'available', label: 'Đang hiển thị' },
  { value: 'rented', label: 'Đã thuê' },
  { value: 'hidden', label: 'Đã ẩn' },
  { value: 'expired', label: 'Hết hạn' },
];

const STATUS_BADGE = {
  draft: 'bg-slate-100 text-slate-600',
  available: 'bg-emerald-50 text-emerald-700',
  rented: 'bg-blue-50 text-blue-700',
  hidden: 'bg-amber-50 text-amber-700',
  expired: 'bg-red-50 text-red-700',
};

function statusLabel(value) {
  return STATUS_OPTIONS.find((o) => o.value === value)?.label || value;
}

function formatPrice(p) {
  if (p == null) return '—';
  return `${new Intl.NumberFormat('vi-VN').format(Number(p))} đ`;
}

function formatDate(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('vi-VN', { hour12: false });
  } catch {
    return iso;
  }
}

export default function AdminRoomsPage() {
  const [rooms, setRooms] = useState([]);
  const [filters, setFilters] = useState({ keyword: '', status: '' });
  const [searchInput, setSearchInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busyId, setBusyId] = useState(null);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const params = { limit: 100 };
      if (filters.keyword) params.keyword = filters.keyword;
      if (filters.status) params.status = filters.status;
      const data = await fetchAdminRooms(params);
      setRooms(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e.message || 'Không tải được danh sách phòng');
      setRooms([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [filters]);

  const submitSearch = (e) => {
    e.preventDefault();
    setFilters((prev) => ({ ...prev, keyword: searchInput.trim() }));
  };

  const handleStatus = async (roomId, newStatus) => {
    setBusyId(roomId);
    setMessage(newStatus === 'available' ? 'Đang kiểm duyệt nội dung và ảnh bằng AI...' : '');
    setError('');
    try {
      await updateRoomStatus(roomId, newStatus);
      setMessage(newStatus === 'available' ? 'AI đã duyệt tin, phòng đã được hiển thị.' : 'Đã cập nhật trạng thái phòng.');
      await load();
    } catch (e) {
      setError(e.message || 'Cập nhật thất bại');
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (roomId, title) => {
    if (!window.confirm(`Xoá tin đăng "${title}"? Hành động không thể hoàn tác.`)) return;
    setBusyId(roomId);
    setMessage('');
    setError('');
    try {
      await deleteRoom(roomId);
      setMessage('Đã xoá tin đăng.');
      await load();
    } catch (e) {
      setError(e.message || 'Xoá thất bại');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm font-semibold text-blue-600">Tin đăng</p>
        <h1 className="text-2xl font-bold text-slate-900">Quản lý phòng / tin đăng</h1>
        <p className="text-sm text-slate-500 mt-1">
          Khi chuyển tin sang hiển thị, AI sẽ kiểm duyệt nội dung và ảnh trước khi duyệt.
        </p>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
        <form onSubmit={submitSearch} className="grid sm:grid-cols-4 gap-3">
          <div className="sm:col-span-2">
            <input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Tìm theo tiêu đề hoặc địa chỉ..."
              className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <select
            value={filters.status}
            onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value }))}
            className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm bg-white"
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <div className="sm:col-span-4 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setSearchInput('');
                setFilters({ keyword: '', status: '' });
              }}
              className="rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"
            >
              Xoá lọc
            </button>
            <button
              type="submit"
              className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 text-sm font-semibold"
            >
              Tìm kiếm
            </button>
          </div>
        </form>
      </div>

      {message && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl px-4 py-3 text-sm">
          {message}
        </div>
      )}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
          {error}
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-slate-500 text-sm">Đang tải...</div>
        ) : rooms.length === 0 ? (
          <div className="p-10 text-center text-slate-500 text-sm">Không có tin đăng nào.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="text-left px-4 py-3 font-medium">Tin đăng</th>
                  <th className="text-left px-4 py-3 font-medium">Giá / Diện tích</th>
                  <th className="text-left px-4 py-3 font-medium">Chủ tin (ID)</th>
                  <th className="text-left px-4 py-3 font-medium">Trạng thái</th>
                  <th className="text-left px-4 py-3 font-medium">Đăng lúc</th>
                  <th className="text-right px-4 py-3 font-medium">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rooms.map((r) => {
                  const status = String(r.status).toLowerCase();
                  return (
                    <tr key={r.id} className="hover:bg-slate-50/60">
                      <td className="px-4 py-3 max-w-[24rem]">
                        <Link
                          to={`/room/${r.id}`}
                          target="_blank"
                          rel="noreferrer"
                          className="font-medium text-slate-800 hover:text-blue-700 line-clamp-1"
                        >
                          {r.title}
                        </Link>
                        <div className="text-xs text-slate-500 line-clamp-1">{r.address}</div>
                        <div className="text-[10px] uppercase tracking-wide text-slate-400 mt-0.5">
                          {r.room_type} · #{r.id}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        <div className="font-semibold">{formatPrice(r.price)}</div>
                        <div className="text-xs text-slate-500">{r.area_sqm ? `${r.area_sqm} m²` : '—'}</div>
                      </td>
                      <td className="px-4 py-3 text-slate-700">#{r.landlord_id}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
                            STATUS_BADGE[status] || 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {statusLabel(status)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500">{formatDate(r.created_at)}</td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end items-center gap-2">
                          <select
                            disabled={busyId === r.id}
                            value={status}
                            onChange={(e) => handleStatus(r.id, e.target.value)}
                            className="rounded-lg border border-slate-200 px-2 py-1.5 text-xs bg-white disabled:opacity-50"
                          >
                            <option value="draft">Nháp</option>
                            <option value="available">Hiển thị</option>
                            <option value="rented">Đã thuê</option>
                            <option value="hidden">Ẩn</option>
                            <option value="expired">Hết hạn</option>
                          </select>
                          <button
                            type="button"
                            disabled={busyId === r.id}
                            onClick={() => handleDelete(r.id, r.title)}
                            className="rounded-lg border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-50 px-2.5 py-1.5 text-xs font-semibold"
                          >
                            Xoá
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

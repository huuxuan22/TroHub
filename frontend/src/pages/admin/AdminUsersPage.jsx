import React, { useEffect, useState } from 'react';
import { deleteUser, fetchAdminUsers, updateUserStatus } from '../../services/adminApi';
import { useAuth } from '../../contexts/AuthContext';

const ROLE_OPTIONS = [
  { value: '', label: 'Tất cả vai trò' },
  { value: 'tenant', label: 'Người thuê' },
  { value: 'landlord', label: 'Chủ nhà' },
  { value: 'admin', label: 'Admin' },
];

const STATUS_OPTIONS = [
  { value: '', label: 'Tất cả trạng thái' },
  { value: 'active', label: 'Hoạt động' },
  { value: 'inactive', label: 'Tạm khoá' },
  { value: 'banned', label: 'Cấm' },
];

const ROLE_BADGE = {
  tenant: { label: 'Người thuê', cls: 'bg-slate-100 text-slate-700' },
  landlord: { label: 'Chủ nhà', cls: 'bg-blue-50 text-blue-700' },
  admin: { label: 'Admin', cls: 'bg-amber-50 text-amber-700' },
};

const STATUS_BADGE = {
  active: { label: 'Hoạt động', cls: 'bg-emerald-50 text-emerald-700' },
  inactive: { label: 'Tạm khoá', cls: 'bg-slate-100 text-slate-600' },
  banned: { label: 'Cấm', cls: 'bg-red-50 text-red-700' },
};

function formatDate(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('vi-VN', { hour12: false });
  } catch {
    return iso;
  }
}

export default function AdminUsersPage() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [filters, setFilters] = useState({ keyword: '', role: '', status: '' });
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
      if (filters.role) params.role = filters.role;
      if (filters.status) params.status = filters.status;
      const data = await fetchAdminUsers(params);
      setUsers(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e.message || 'Không tải được danh sách người dùng');
      setUsers([]);
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

  const handleStatusChange = async (userId, newStatus) => {
    setBusyId(userId);
    setMessage('');
    setError('');
    try {
      await updateUserStatus(userId, newStatus);
      setMessage('Đã cập nhật trạng thái người dùng.');
      await load();
    } catch (e) {
      setError(e.message || 'Cập nhật thất bại');
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (userId, fullName) => {
    if (!window.confirm(`Xoá vĩnh viễn tài khoản "${fullName}"? Hành động không thể hoàn tác.`)) return;
    setBusyId(userId);
    setMessage('');
    setError('');
    try {
      await deleteUser(userId);
      setMessage('Đã xoá người dùng.');
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
        <p className="text-sm font-semibold text-blue-600">Tài khoản</p>
        <h1 className="text-2xl font-bold text-slate-900">Quản lý người dùng</h1>
        <p className="text-sm text-slate-500 mt-1">
          Tìm kiếm, lọc theo vai trò/trạng thái và xử lý tài khoản vi phạm.
        </p>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
        <form onSubmit={submitSearch} className="grid sm:grid-cols-4 gap-3">
          <div className="sm:col-span-2">
            <input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Tìm theo họ tên hoặc email..."
              className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <select
            value={filters.role}
            onChange={(e) => setFilters((prev) => ({ ...prev, role: e.target.value }))}
            className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm bg-white"
          >
            {ROLE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
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
                setFilters({ keyword: '', role: '', status: '' });
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
        ) : users.length === 0 ? (
          <div className="p-10 text-center text-slate-500 text-sm">Không có người dùng nào.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="text-left px-4 py-3 font-medium">Người dùng</th>
                  <th className="text-left px-4 py-3 font-medium">Vai trò</th>
                  <th className="text-left px-4 py-3 font-medium">Trạng thái</th>
                  <th className="text-left px-4 py-3 font-medium">Đăng ký lúc</th>
                  <th className="text-right px-4 py-3 font-medium">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((u) => {
                  const role = String(u.role).toLowerCase();
                  const status = String(u.status).toLowerCase();
                  const roleBadge = ROLE_BADGE[role] || ROLE_BADGE.tenant;
                  const statusBadge = STATUS_BADGE[status] || STATUS_BADGE.active;
                  const isSelf = currentUser?.id === u.id;
                  return (
                    <tr key={u.id} className="hover:bg-slate-50/60">
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-800">
                          {u.full_name}
                          {isSelf && (
                            <span className="ml-2 text-[10px] uppercase tracking-wide text-blue-600 font-semibold">
                              (Bạn)
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-500">{u.email}</div>
                        {u.phone_number && (
                          <div className="text-xs text-slate-400">{u.phone_number}</div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${roleBadge.cls}`}>
                          {roleBadge.label}
                        </span>
                        {u.landlord_profile && Number(u.landlord_profile.is_verified) === 1 && (
                          <div className="mt-1 text-[10px] text-emerald-700 font-semibold">✓ đã xác minh</div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${statusBadge.cls}`}>
                          {statusBadge.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500">{formatDate(u.created_at)}</td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end items-center gap-2">
                          <select
                            disabled={busyId === u.id || isSelf}
                            value={status}
                            onChange={(e) => handleStatusChange(u.id, e.target.value)}
                            className="rounded-lg border border-slate-200 px-2 py-1.5 text-xs bg-white disabled:opacity-50"
                            title={isSelf ? 'Không thể đổi trạng thái của chính mình' : 'Đổi trạng thái'}
                          >
                            <option value="active">Hoạt động</option>
                            <option value="inactive">Tạm khoá</option>
                            <option value="banned">Cấm</option>
                          </select>
                          <button
                            type="button"
                            disabled={busyId === u.id || isSelf}
                            onClick={() => handleDelete(u.id, u.full_name)}
                            className="rounded-lg border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-50 px-2.5 py-1.5 text-xs font-semibold"
                            title={isSelf ? 'Không thể xoá chính mình' : 'Xoá người dùng'}
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

import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchAdminReports, updateReportStatus } from '../../services/adminApi';

const STATUS_OPTIONS = [
  { value: '', label: 'Tất cả trạng thái' },
  { value: 'pending', label: 'Chờ xử lý' },
  { value: 'reviewed', label: 'Đang xem xét' },
  { value: 'resolved', label: 'Đã xử lý' },
  { value: 'rejected', label: 'Từ chối' },
];

const STATUS_BADGE = {
  pending: 'bg-amber-50 text-amber-700',
  reviewed: 'bg-blue-50 text-blue-700',
  resolved: 'bg-emerald-50 text-emerald-700',
  rejected: 'bg-slate-100 text-slate-600',
};

function statusLabel(value) {
  return STATUS_OPTIONS.find((o) => o.value === value)?.label || value;
}

function formatDate(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('vi-VN', { hour12: false });
  } catch {
    return iso;
  }
}

export default function AdminReportsPage() {
  const [reports, setReports] = useState([]);
  const [statusFilter, setStatusFilter] = useState('pending');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busyId, setBusyId] = useState(null);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const params = { limit: 100 };
      if (statusFilter) params.status = statusFilter;
      const data = await fetchAdminReports(params);
      setReports(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e.message || 'Không tải được danh sách báo cáo');
      setReports([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [statusFilter]);

  const handleStatus = async (reportId, newStatus) => {
    setBusyId(reportId);
    setMessage('');
    setError('');
    try {
      await updateReportStatus(reportId, newStatus);
      setMessage('Đã cập nhật báo cáo.');
      await load();
    } catch (e) {
      setError(e.message || 'Cập nhật thất bại');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm font-semibold text-blue-600">Báo cáo người dùng</p>
        <h1 className="text-2xl font-bold text-slate-900">Quản lý báo cáo</h1>
        <p className="text-sm text-slate-500 mt-1">
          Xử lý các báo cáo về tin đăng vi phạm hoặc thông tin không chính xác.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {STATUS_OPTIONS.map((opt) => (
          <button
            key={opt.value || 'all'}
            type="button"
            onClick={() => setStatusFilter(opt.value)}
            className={`px-3.5 py-1.5 rounded-full text-sm font-medium border transition-colors ${
              statusFilter === opt.value
                ? 'bg-blue-600 border-blue-600 text-white'
                : 'bg-white border-slate-200 text-slate-600 hover:border-blue-300'
            }`}
          >
            {opt.label}
          </button>
        ))}
        <div className="ml-auto">
          <button
            type="button"
            onClick={load}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            ⟳ Làm mới
          </button>
        </div>
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
        ) : reports.length === 0 ? (
          <div className="p-10 text-center text-slate-500 text-sm">Không có báo cáo nào.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="text-left px-4 py-3 font-medium">ID</th>
                  <th className="text-left px-4 py-3 font-medium">Người báo cáo</th>
                  <th className="text-left px-4 py-3 font-medium">Phòng</th>
                  <th className="text-left px-4 py-3 font-medium">Lý do</th>
                  <th className="text-left px-4 py-3 font-medium">Trạng thái</th>
                  <th className="text-left px-4 py-3 font-medium">Tạo lúc</th>
                  <th className="text-right px-4 py-3 font-medium">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {reports.map((r) => {
                  const status = String(r.status).toLowerCase();
                  return (
                    <tr key={r.id} className="hover:bg-slate-50/60 align-top">
                      <td className="px-4 py-3 text-slate-500">#{r.id}</td>
                      <td className="px-4 py-3 text-slate-700">User #{r.user_id}</td>
                      <td className="px-4 py-3">
                        <Link
                          to={`/room/${r.room_id}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-blue-700 hover:underline font-medium"
                        >
                          Phòng #{r.room_id}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-slate-700 max-w-md">
                        <p className="line-clamp-3">{r.reason}</p>
                      </td>
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
                        <select
                          disabled={busyId === r.id}
                          value={status}
                          onChange={(e) => handleStatus(r.id, e.target.value)}
                          className="rounded-lg border border-slate-200 px-2 py-1.5 text-xs bg-white disabled:opacity-50"
                        >
                          <option value="pending">Chờ xử lý</option>
                          <option value="reviewed">Đang xem xét</option>
                          <option value="resolved">Đã xử lý</option>
                          <option value="rejected">Từ chối</option>
                        </select>
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

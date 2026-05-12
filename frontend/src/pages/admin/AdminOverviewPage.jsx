import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchAdminStats } from '../../services/adminApi';

function StatCard({ icon, label, value, accent = 'blue', sub }) {
  const accents = {
    blue: 'from-blue-500 to-blue-600',
    emerald: 'from-emerald-500 to-emerald-600',
    amber: 'from-amber-500 to-orange-500',
    rose: 'from-rose-500 to-rose-600',
    violet: 'from-violet-500 to-purple-600',
  };
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-slate-500 mb-1">{label}</p>
          <p className="text-2xl font-bold text-slate-900">{value?.toLocaleString('vi-VN') ?? '—'}</p>
          {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
        </div>
        <div
          className={`w-11 h-11 rounded-xl flex items-center justify-center text-white text-xl bg-gradient-to-br ${accents[accent] || accents.blue}`}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}

export default function AdminOverviewPage() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchAdminStats();
      setStats(data);
    } catch (e) {
      setError(e.message || 'Không tải được thống kê');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-blue-600">Bảng điều khiển</p>
          <h1 className="text-2xl font-bold text-slate-900">Tổng quan hệ thống</h1>
          <p className="text-sm text-slate-500 mt-1">
            Theo dõi nhanh số liệu người dùng, hồ sơ chủ nhà chờ duyệt, tin đăng và báo cáo.
          </p>
        </div>
        <button
          type="button"
          onClick={load}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
        >
          ⟳ Làm mới
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center text-slate-500 text-sm">
          Đang tải số liệu...
        </div>
      ) : stats ? (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
            <StatCard
              icon="👥"
              label="Tổng người dùng"
              value={stats.total_users}
              sub={`${stats.total_tenants} người thuê · ${stats.total_landlords} chủ nhà`}
              accent="blue"
            />
            <StatCard
              icon="🪪"
              label="Hồ sơ chờ duyệt"
              value={stats.pending_landlord_applications}
              sub={`${stats.verified_landlords} hồ sơ đã duyệt`}
              accent="amber"
            />
            <StatCard
              icon="🏠"
              label="Tổng tin đăng"
              value={stats.total_rooms}
              sub={`${stats.rooms_available} đang hiển thị · ${stats.rooms_hidden} đã ẩn`}
              accent="emerald"
            />
            <StatCard
              icon="🚩"
              label="Báo cáo"
              value={stats.total_reports}
              sub={`${stats.pending_reports} báo cáo mới`}
              accent="rose"
            />
            <StatCard icon="🛠️" label="Quản trị viên" value={stats.total_admins} accent="violet" />
            <StatCard
              icon="✅"
              label="Chủ nhà đã xác minh"
              value={stats.verified_landlords}
              accent="emerald"
            />
            <StatCard icon="📣" label="Tin đang hiển thị" value={stats.rooms_available} accent="blue" />
            <StatCard icon="🙈" label="Tin đã ẩn" value={stats.rooms_hidden} accent="rose" />
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <Link
              to="/admin/landlords"
              className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:border-blue-300 hover:shadow-md transition-all"
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-slate-800">Việc cần xử lý ngay</h3>
                <span className="text-xs font-semibold text-blue-600">Xem chi tiết →</span>
              </div>
              <p className="text-sm text-slate-500 mb-3">
                Có <strong className="text-slate-900">{stats.pending_landlord_applications}</strong> hồ sơ chủ
                nhà đang chờ xác minh và <strong className="text-slate-900">{stats.pending_reports}</strong>{' '}
                báo cáo chưa xử lý.
              </p>
              <div className="flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-50 text-amber-700">
                  🪪 {stats.pending_landlord_applications} hồ sơ
                </span>
                <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-rose-50 text-rose-700">
                  🚩 {stats.pending_reports} báo cáo
                </span>
              </div>
            </Link>

            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
              <h3 className="font-semibold text-slate-800 mb-3">Lối tắt</h3>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <Link
                  to="/admin/users"
                  className="rounded-xl border border-slate-200 px-3 py-2.5 text-center font-medium text-slate-700 hover:border-blue-300 hover:text-blue-700"
                >
                  Quản lý người dùng
                </Link>
                <Link
                  to="/admin/rooms"
                  className="rounded-xl border border-slate-200 px-3 py-2.5 text-center font-medium text-slate-700 hover:border-blue-300 hover:text-blue-700"
                >
                  Quản lý tin đăng
                </Link>
                <Link
                  to="/admin/reports"
                  className="rounded-xl border border-slate-200 px-3 py-2.5 text-center font-medium text-slate-700 hover:border-blue-300 hover:text-blue-700"
                >
                  Xem báo cáo
                </Link>
                <Link
                  to="/admin/landlords"
                  className="rounded-xl border border-slate-200 px-3 py-2.5 text-center font-medium text-slate-700 hover:border-blue-300 hover:text-blue-700"
                >
                  Duyệt chủ nhà
                </Link>
              </div>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}

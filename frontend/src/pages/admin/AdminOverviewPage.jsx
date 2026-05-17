import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchAdminStats } from '../../services/adminApi';

function formatNumber(n) {
  if (n == null || Number.isNaN(n)) return '—';
  return new Intl.NumberFormat('vi-VN').format(n);
}

function formatPrice(n) {
  if (n == null || Number.isNaN(n)) return '—';
  return `${formatNumber(Math.round(n))} đ/tháng`;
}

function StatCard({ icon, label, value, accent = 'blue', sub, highlight }) {
  const accents = {
    blue: 'from-blue-500 to-blue-600',
    emerald: 'from-emerald-500 to-emerald-600',
    amber: 'from-amber-500 to-orange-500',
    rose: 'from-rose-500 to-rose-600',
    violet: 'from-violet-500 to-purple-600',
    cyan: 'from-cyan-500 to-teal-600',
  };
  return (
    <div
      className={`bg-white border rounded-2xl p-5 shadow-sm transition-shadow hover:shadow-md ${highlight ? 'border-amber-300 ring-1 ring-amber-100' : 'border-slate-200'
        }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-slate-500 mb-1">{label}</p>
          <p className="text-2xl font-bold text-slate-900 tracking-tight">{value}</p>
          {sub && <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">{sub}</p>}
        </div>
        <div
          className={`w-11 h-11 shrink-0 rounded-xl flex items-center justify-center text-white text-xl bg-gradient-to-br shadow-sm ${accents[accent] || accents.blue}`}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}

const ROOM_STATUS_LABELS = {
  draft: 'Chờ duyệt',
  available: 'Đang hiển thị',
  rented: 'Đã thuê',
  hidden: 'Đã ẩn',
  expired: 'Hết hạn',
};

const ROOM_STATUS_COLORS = {
  draft: 'bg-amber-500',
  available: 'bg-emerald-500',
  rented: 'bg-blue-500',
  hidden: 'bg-slate-400',
  expired: 'bg-rose-500',
};

function VerificationRing({ percent }) {
  const p = Math.min(100, Math.max(0, percent ?? 0));
  const r = 52;
  const c = 2 * Math.PI * r;
  const offset = c - (p / 100) * c;

  return (
    <div className="relative w-[140px] h-[140px] mx-auto">
      <svg width="140" height="140" viewBox="0 0 140 140" className="-rotate-90">
        <circle cx="70" cy="70" r={r} fill="none" stroke="#e2e8f0" strokeWidth="12" />
        <circle
          cx="70"
          cy="70"
          r={r}
          fill="none"
          stroke="url(#verifyGrad)"
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          className="transition-all duration-700"
        />
        <defs>
          <linearGradient id="verifyGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#10b981" />
            <stop offset="100%" stopColor="#3b82f6" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-bold text-slate-900">{p}%</span>
        <span className="text-xs text-slate-500 mt-0.5">đã xác minh</span>
      </div>
    </div>
  );
}

function DistrictBarChart({ districts }) {
  const max = Math.max(...districts.map((d) => d.count), 1);
  const colors = ['bg-blue-500', 'bg-indigo-500', 'bg-violet-500', 'bg-cyan-500', 'bg-teal-500', 'bg-emerald-500'];

  if (!districts.length) {
    return <p className="text-sm text-slate-400 text-center py-8">Chưa có dữ liệu khu vực</p>;
  }

  return (
    <div className="space-y-3">
      {districts.map((d, i) => (
        <div key={d.name}>
          <div className="flex items-center justify-between text-sm mb-1 gap-2">
            <span className="font-medium text-slate-700 truncate" title={d.name}>
              {d.name}
            </span>
            <span className="text-slate-500 shrink-0 tabular-nums">{formatNumber(d.count)} phòng</span>
          </div>
          <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${colors[i % colors.length]}`}
              style={{ width: `${(d.count / max) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function RoomStatusChart({ roomsByStatus, total }) {
  const entries = Object.entries(roomsByStatus || {}).filter(([, c]) => c > 0);
  if (!entries.length) {
    return <p className="text-sm text-slate-400 text-center py-6">Chưa có tin đăng</p>;
  }

  return (
    <div className="space-y-3">
      {entries.map(([status, count]) => {
        const pct = total ? Math.round((count / total) * 100) : 0;
        return (
          <div key={status}>
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="flex items-center gap-2 text-slate-700">
                <span className={`w-2.5 h-2.5 rounded-full ${ROOM_STATUS_COLORS[status] || 'bg-slate-400'}`} />
                {ROOM_STATUS_LABELS[status] || status}
              </span>
              <span className="text-slate-500 tabular-nums">
                {formatNumber(count)} ({pct}%)
              </span>
            </div>
            <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
              <div
                className={`h-full rounded-full ${ROOM_STATUS_COLORS[status] || 'bg-slate-400'}`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        );
      })}
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

  const userRoleSlices = useMemo(() => {
    if (!stats) return [];
    return [
      { label: 'Người thuê', count: stats.total_tenants, color: 'bg-blue-500' },
      { label: 'Chủ nhà', count: stats.total_landlords, color: 'bg-emerald-500' },
      { label: 'Admin', count: stats.total_admins, color: 'bg-violet-500' },
    ].filter((s) => s.count > 0);
  }, [stats]);

  const userRoleMax = useMemo(
    () => Math.max(...userRoleSlices.map((s) => s.count), 1),
    [userRoleSlices],
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-blue-600">Bảng điều khiển</p>
          <h1 className="text-2xl font-bold text-slate-900">Tổng quan hệ thống</h1>
          <p className="text-sm text-slate-500 mt-1">
            Theo dõi trực quan người dùng, tin đăng, xác minh, vi phạm và thị trường cho thuê.
          </p>
        </div>
        <button
          type="button"
          onClick={load}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-60"
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
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-500 text-sm">
          <div className="inline-block w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mb-3" />
          <p>Đang tải số liệu hệ thống...</p>
        </div>
      ) : stats ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <StatCard
              icon="👥"
              label="Tổng số người dùng"
              value={formatNumber(stats.total_users)}
              sub={`${formatNumber(stats.total_tenants)} người thuê · ${formatNumber(stats.total_landlords)} chủ nhà`}
              accent="blue"
            />
            <StatCard
              icon="🏠"
              label="Tổng số bài đăng"
              value={formatNumber(stats.total_rooms)}
              sub={`${formatNumber(stats.rooms_available)} đang hiển thị`}
              accent="emerald"
            />
            <StatCard
              icon="⏳"
              label="Bài chờ duyệt"
              value={formatNumber(stats.rooms_pending)}
              sub="Tin ở trạng thái nháp"
              accent="amber"
              highlight={stats.rooms_pending > 0}
            />
            <StatCard
              icon="🚩"
              label="Số vi phạm"
              value={formatNumber(stats.violations_count ?? stats.total_reports)}
              sub={`${formatNumber(stats.pending_reports)} báo cáo chưa xử lý`}
              accent="rose"
              highlight={stats.pending_reports > 0}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            <StatCard
              icon="✅"
              label="Tỉ lệ xác thực"
              value={`${stats.verification_rate_percent ?? 0}%`}
              sub={`${formatNumber(stats.verified_landlords)} / ${formatNumber(
                (stats.verified_landlords || 0) + (stats.pending_landlord_applications || 0),
              )} hồ sơ chủ nhà`}
              accent="cyan"
            />
            <StatCard
              icon="📍"
              label="Khu vực nhiều phòng nhất"
              value={stats.top_district_name || '—'}
              sub={
                stats.top_district_count
                  ? `${formatNumber(stats.top_district_count)} tin đăng tại khu vực này`
                  : 'Chưa đủ dữ liệu'
              }
              accent="violet"
            />
            <StatCard
              icon="💰"
              label="Giá thuê trung bình"
              value={formatPrice(stats.average_rent_price)}
              sub="Trên toàn bộ tin đăng trong hệ thống"
              accent="emerald"
            />
          </div>

          <div className="grid lg:grid-cols-3 gap-4">
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
              <h3 className="font-semibold text-slate-800 mb-1">Tỉ lệ xác minh chủ nhà</h3>
              <p className="text-xs text-slate-500 mb-4">Hồ sơ đã duyệt so với tổng hồ sơ nộp</p>
              <VerificationRing percent={stats.verification_rate_percent} />
              <div className="mt-4 grid grid-cols-2 gap-2 text-center text-sm">
                <div className="rounded-xl bg-emerald-50 px-3 py-2">
                  <p className="text-emerald-700 font-bold">{formatNumber(stats.verified_landlords)}</p>
                  <p className="text-xs text-emerald-600">Đã duyệt</p>
                </div>
                <div className="rounded-xl bg-amber-50 px-3 py-2">
                  <p className="text-amber-700 font-bold">
                    {formatNumber(stats.pending_landlord_applications)}
                  </p>
                  <p className="text-xs text-amber-600">Chờ duyệt</p>
                </div>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
              <h3 className="font-semibold text-slate-800 mb-1">Phân bố theo khu vực</h3>
              <p className="text-xs text-slate-500 mb-4">Top khu vực có nhiều tin đăng nhất</p>
              <DistrictBarChart districts={stats.top_districts || []} />
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
              <h3 className="font-semibold text-slate-800 mb-1">Trạng thái tin đăng</h3>
              <p className="text-xs text-slate-500 mb-4">Tổng {formatNumber(stats.total_rooms)} bài đăng</p>
              <RoomStatusChart roomsByStatus={stats.rooms_by_status} total={stats.total_rooms} />
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
              <h3 className="font-semibold text-slate-800 mb-1">Cơ cấu người dùng</h3>
              <p className="text-xs text-slate-500 mb-4">Phân bố theo vai trò trong hệ thống</p>
              <div className="space-y-3">
                {userRoleSlices.map((slice) => (
                  <div key={slice.label}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-slate-700">{slice.label}</span>
                      <span className="text-slate-500 tabular-nums">{formatNumber(slice.count)}</span>
                    </div>
                    <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${slice.color}`}
                        style={{ width: `${(slice.count / userRoleMax) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <Link
              to="/admin/landlords"
              className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl p-5 shadow-sm text-white hover:shadow-lg transition-shadow block"
            >
              <h3 className="font-semibold mb-2">Việc cần xử lý ngay</h3>
              <p className="text-sm text-blue-100 mb-4 leading-relaxed">
                Có <strong className="text-white">{formatNumber(stats.pending_landlord_applications)}</strong>{' '}
                hồ sơ chủ nhà chờ xác minh,{' '}
                <strong className="text-white">{formatNumber(stats.rooms_pending)}</strong> tin nháp và{' '}
                <strong className="text-white">{formatNumber(stats.pending_reports)}</strong> báo cáo mới.
              </p>
              <div className="flex flex-wrap gap-2">
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-white/15">
                  🪪 {formatNumber(stats.pending_landlord_applications)} hồ sơ
                </span>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-white/15">
                  📝 {formatNumber(stats.rooms_pending)} tin nháp
                </span>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-white/15">
                  🚩 {formatNumber(stats.pending_reports)} báo cáo
                </span>
              </div>
              <p className="text-xs text-blue-200 mt-4 font-medium">Xem chi tiết →</p>
            </Link>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <h3 className="font-semibold text-slate-800 mb-3">Lối tắt quản trị</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
              <Link
                to="/admin/users"
                className="rounded-xl border border-slate-200 px-3 py-2.5 text-center font-medium text-slate-700 hover:border-blue-300 hover:text-blue-700 hover:bg-blue-50/50"
              >
                Quản lý người dùng
              </Link>
              <Link
                to="/admin/rooms"
                className="rounded-xl border border-slate-200 px-3 py-2.5 text-center font-medium text-slate-700 hover:border-blue-300 hover:text-blue-700 hover:bg-blue-50/50"
              >
                Kiểm duyệt tin đăng
              </Link>
              <Link
                to="/admin/landlords"
                className="rounded-xl border border-slate-200 px-3 py-2.5 text-center font-medium text-slate-700 hover:border-blue-300 hover:text-blue-700 hover:bg-blue-50/50"
              >
                Duyệt xác thực
              </Link>
              <Link
                to="/admin/reports"
                className="rounded-xl border border-slate-200 px-3 py-2.5 text-center font-medium text-slate-700 hover:border-blue-300 hover:text-blue-700 hover:bg-blue-50/50"
              >
                Xử lý vi phạm
              </Link>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}

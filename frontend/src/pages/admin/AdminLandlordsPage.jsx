import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  approveLandlord,
  fetchLandlordCounts,
  fetchLandlordProfile,
  fetchLandlordProfiles,
  rejectLandlord,
} from '../../services/adminApi';

const TABS = [
  { id: 'pending', label: 'Chờ duyệt' },
  { id: 'verified', label: 'Đã duyệt' },
  { id: 'all', label: 'Tất cả' },
];

function formatDate(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('vi-VN', { hour12: false });
  } catch {
    return iso;
  }
}

function timeAgo(iso) {
  if (!iso) return '';
  const date = new Date(iso);
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (Number.isNaN(seconds) || seconds < 0) return '';
  if (seconds < 60) return 'vừa xong';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} phút trước`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} giờ trước`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} ngày trước`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} tháng trước`;
  return `${Math.floor(months / 12)} năm trước`;
}

function roleLabel(role) {
  const v = String(role || '').toLowerCase();
  if (v === 'admin') return 'Admin';
  if (v === 'landlord') return 'Chủ nhà';
  return 'Người thuê';
}

export default function AdminLandlordsPage() {
  const [tab, setTab] = useState('pending');
  const [items, setItems] = useState([]);
  const [counts, setCounts] = useState({ pending: 0, verified: 0, total: 0 });
  const [searchInput, setSearchInput] = useState('');
  const [keyword, setKeyword] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [detail, setDetail] = useState(null); // landlord profile shown in drawer
  const [detailLoading, setDetailLoading] = useState(false);
  const [confirm, setConfirm] = useState(null); // {action: 'approve'|'reject', application}
  const [rejectReason, setRejectReason] = useState('');

  const reloadCounts = useCallback(async () => {
    try {
      const data = await fetchLandlordCounts();
      setCounts(data);
    } catch {
      /* badge counts là phụ — bỏ qua lỗi */
    }
  }, []);

  const load = useCallback(
    async (state = tab, kw = keyword) => {
      setLoading(true);
      setError('');
      try {
        const data = await fetchLandlordProfiles({ state, keyword: kw, limit: 100 });
        setItems(Array.isArray(data) ? data : []);
      } catch (e) {
        setError(e.message || 'Không tải được danh sách hồ sơ');
        setItems([]);
      } finally {
        setLoading(false);
      }
    },
    [tab, keyword],
  );

  useEffect(() => {
    load(tab, keyword);
    reloadCounts();
  }, [tab, keyword, load, reloadCounts]);

  const submitSearch = (e) => {
    e.preventDefault();
    setKeyword(searchInput.trim());
  };

  const clearSearch = () => {
    setSearchInput('');
    setKeyword('');
  };

  const openDetail = async (userId) => {
    setDetail({ loading: true });
    setDetailLoading(true);
    try {
      const data = await fetchLandlordProfile(userId);
      setDetail(data);
    } catch (e) {
      setError(e.message || 'Không tải được chi tiết hồ sơ');
      setDetail(null);
    } finally {
      setDetailLoading(false);
    }
  };

  const closeDetail = () => setDetail(null);

  const askApprove = (app) => {
    setRejectReason('');
    setConfirm({ action: 'approve', application: app });
  };

  const askReject = (app) => {
    setRejectReason('');
    setConfirm({ action: 'reject', application: app });
  };

  const closeConfirm = () => {
    setConfirm(null);
    setRejectReason('');
  };

  const runConfirm = async () => {
    if (!confirm) return;
    const { action, application } = confirm;
    const userId = application.user_id;
    setBusyId(userId);
    setMessage('');
    setError('');
    try {
      if (action === 'approve') {
        await approveLandlord(userId);
        setMessage(`Đã duyệt hồ sơ của ${application.user?.full_name || `User #${userId}`}.`);
      } else {
        await rejectLandlord(userId, rejectReason.trim());
        setMessage(`Đã từ chối hồ sơ của ${application.user?.full_name || `User #${userId}`}.`);
      }
      closeConfirm();
      if (detail && detail.user_id === userId) closeDetail();
      await Promise.all([load(tab, keyword), reloadCounts()]);
    } catch (e) {
      setError(e.message || 'Thao tác thất bại');
    } finally {
      setBusyId(null);
    }
  };

  const tabBadge = useMemo(
    () => ({
      pending: counts.pending,
      verified: counts.verified,
      all: counts.total,
    }),
    [counts],
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-blue-600">Xác minh tài khoản</p>
          <h1 className="text-2xl font-bold text-slate-900">Duyệt hồ sơ chủ nhà</h1>
          <p className="text-sm text-slate-500 mt-1">
            Xét duyệt thông tin chủ nhà từ trang &ldquo;Đăng ký làm chủ nhà&rdquo;. Người dùng sẽ nhận thông
            báo ngay sau khi bạn duyệt hoặc từ chối.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 text-amber-700 px-3 py-1.5 text-xs font-semibold">
            🕒 {counts.pending} chờ duyệt
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 text-emerald-700 px-3 py-1.5 text-xs font-semibold">
            ✓ {counts.verified} đã duyệt
          </span>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-sm font-medium border transition-colors ${
              tab === t.id
                ? 'bg-blue-600 border-blue-600 text-white'
                : 'bg-white border-slate-200 text-slate-600 hover:border-blue-300'
            }`}
          >
            <span>{t.label}</span>
            <span
              className={`inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 rounded-full text-[11px] font-bold ${
                tab === t.id ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
              }`}
            >
              {tabBadge[t.id] ?? 0}
            </span>
          </button>
        ))}
        <div className="ml-auto flex items-center gap-2">
          <form onSubmit={submitSearch} className="flex items-center gap-2">
            <input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Tìm tên / email / tên kinh doanh"
              className="w-64 border border-slate-200 rounded-xl px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="submit"
              className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 text-sm font-semibold"
            >
              Tìm
            </button>
            {keyword && (
              <button
                type="button"
                onClick={clearSearch}
                className="rounded-xl border border-slate-200 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50"
              >
                Xoá
              </button>
            )}
          </form>
          <button
            type="button"
            onClick={() => {
              load(tab, keyword);
              reloadCounts();
            }}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
            title="Làm mới"
          >
            ⟳
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
        ) : items.length === 0 ? (
          <div className="p-12 text-center">
            <div className="text-4xl mb-3">📭</div>
            <p className="text-sm text-slate-500">
              {tab === 'pending'
                ? 'Không có hồ sơ nào đang chờ duyệt.'
                : 'Không có hồ sơ phù hợp.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="text-left px-4 py-3 font-medium">Người dùng</th>
                  <th className="text-left px-4 py-3 font-medium">Tên kinh doanh</th>
                  <th className="text-left px-4 py-3 font-medium">CMND / CCCD</th>
                  <th className="text-left px-4 py-3 font-medium">GP kinh doanh</th>
                  <th className="text-left px-4 py-3 font-medium">Trạng thái</th>
                  <th className="text-left px-4 py-3 font-medium">Gửi lúc</th>
                  <th className="text-right px-4 py-3 font-medium">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((item) => {
                  const u = item.user || {};
                  const verified = Number(item.is_verified) === 1;
                  return (
                    <tr key={item.id} className="hover:bg-slate-50/60">
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => openDetail(item.user_id)}
                          className="text-left"
                        >
                          <div className="font-medium text-slate-800 hover:text-blue-700">
                            {u.full_name || '—'}
                          </div>
                          <div className="text-xs text-slate-500">{u.email}</div>
                          {u.phone_number && (
                            <div className="text-xs text-slate-400">{u.phone_number}</div>
                          )}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-slate-700">{item.business_name || '—'}</td>
                      <td className="px-4 py-3 text-slate-700">{item.national_id || '—'}</td>
                      <td className="px-4 py-3 text-slate-700">{item.business_license || '—'}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
                            verified ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                          }`}
                        >
                          {verified ? 'Đã duyệt' : 'Chờ duyệt'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500">
                        <div>{formatDate(item.created_at)}</div>
                        <div className="text-[11px] text-slate-400">{timeAgo(item.created_at)}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => openDetail(item.user_id)}
                            className="rounded-lg border border-slate-200 hover:border-blue-300 hover:text-blue-700 px-3 py-1.5 text-xs font-semibold"
                          >
                            Chi tiết
                          </button>
                          {!verified && (
                            <button
                              type="button"
                              disabled={busyId === item.user_id}
                              onClick={() => askApprove(item)}
                              className="rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white px-3 py-1.5 text-xs font-semibold"
                            >
                              Duyệt
                            </button>
                          )}
                          <button
                            type="button"
                            disabled={busyId === item.user_id}
                            onClick={() => askReject(item)}
                            className="rounded-lg border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-60 px-3 py-1.5 text-xs font-semibold"
                          >
                            {verified ? 'Thu hồi' : 'Từ chối'}
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

      {/* Drawer chi tiết hồ sơ */}
      {detail && (
        <DetailDrawer
          loading={detailLoading || detail.loading === true}
          data={detail.loading === true ? null : detail}
          onClose={closeDetail}
          onApprove={() => detail && !detail.loading && askApprove(detail)}
          onReject={() => detail && !detail.loading && askReject(detail)}
        />
      )}

      {/* Modal xác nhận duyệt / từ chối */}
      {confirm && (
        <ConfirmModal
          action={confirm.action}
          application={confirm.application}
          reason={rejectReason}
          onReasonChange={setRejectReason}
          loading={busyId === confirm.application.user_id}
          onCancel={closeConfirm}
          onConfirm={runConfirm}
        />
      )}
    </div>
  );
}

function DetailDrawer({ loading: isLoading, data, onClose, onApprove, onReject }) {
  const u = data?.user;
  const verified = data ? Number(data.is_verified) === 1 : false;
  return (
    <div className="fixed inset-0 z-50 flex">
      <button
        type="button"
        aria-label="Đóng"
        className="flex-1 bg-slate-900/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="w-full max-w-lg bg-white shadow-2xl flex flex-col overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">
              Hồ sơ chủ nhà
            </p>
            <h2 className="text-lg font-bold text-slate-900">Chi tiết xác minh</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50"
          >
            Đóng
          </button>
        </div>

        <div className="flex-1 p-5 space-y-5">
          {isLoading || !data ? (
            <div className="text-center text-sm text-slate-500 py-10">Đang tải...</div>
          ) : (
            <>
              <section>
                <h3 className="text-sm font-semibold text-slate-800 mb-2">Người dùng</h3>
                <dl className="text-sm text-slate-700 space-y-1.5 bg-slate-50 rounded-xl p-4">
                  <Row label="Họ tên" value={u?.full_name} />
                  <Row label="Email" value={u?.email} />
                  <Row label="Số điện thoại" value={u?.phone_number || '—'} />
                  <Row label="Vai trò hiện tại" value={roleLabel(u?.role)} />
                  <Row label="Tham gia" value={formatDate(u?.created_at)} />
                </dl>
              </section>

              <section>
                <h3 className="text-sm font-semibold text-slate-800 mb-2">Thông tin hồ sơ</h3>
                <dl className="text-sm text-slate-700 space-y-1.5 bg-slate-50 rounded-xl p-4">
                  <Row label="Tên kinh doanh" value={data.business_name || '—'} />
                  <Row label="CMND / CCCD" value={data.national_id || '—'} />
                  <Row label="GP kinh doanh" value={data.business_license || '—'} />
                  <Row
                    label="Trạng thái"
                    value={
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
                          verified ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                        }`}
                      >
                        {verified ? 'Đã duyệt' : 'Chờ duyệt'}
                      </span>
                    }
                  />
                  <Row
                    label="Gửi lúc"
                    value={`${formatDate(data.created_at)} (${timeAgo(data.created_at)})`}
                  />
                </dl>
              </section>

              <section className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-sm text-slate-700">
                <p className="font-semibold text-blue-700 mb-1">Gợi ý kiểm tra</p>
                <ul className="list-disc pl-5 space-y-1 text-slate-600">
                  <li>Tên kinh doanh có khớp với email/họ tên không?</li>
                  <li>CMND/CCCD đủ số ký tự, không trùng tài khoản khác?</li>
                  <li>Đã gọi điện xác minh nếu là khách lần đầu đăng tin?</li>
                </ul>
              </section>
            </>
          )}
        </div>

        {data && (
          <div className="px-5 py-4 border-t border-slate-100 flex flex-wrap gap-2 justify-end">
            {!verified && (
              <button
                type="button"
                onClick={onApprove}
                className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 text-sm font-semibold"
              >
                Duyệt hồ sơ
              </button>
            )}
            <button
              type="button"
              onClick={onReject}
              className="rounded-xl border border-red-200 text-red-600 hover:bg-red-50 px-4 py-2 text-sm font-semibold"
            >
              {verified ? 'Thu hồi xác minh' : 'Từ chối'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex items-start gap-3">
      <dt className="w-36 shrink-0 text-xs uppercase tracking-wide text-slate-500 pt-0.5">{label}</dt>
      <dd className="flex-1 text-sm text-slate-800 break-words">{value || '—'}</dd>
    </div>
  );
}

function ConfirmModal({ action, application, reason, onReasonChange, loading, onCancel, onConfirm }) {
  const isApprove = action === 'approve';
  const verified = Number(application.is_verified) === 1;
  const name = application.user?.full_name || `User #${application.user_id}`;

  const title = isApprove
    ? 'Duyệt hồ sơ chủ nhà'
    : verified
      ? 'Thu hồi xác minh chủ nhà'
      : 'Từ chối hồ sơ chủ nhà';

  const description = isApprove
    ? `Sau khi duyệt, "${name}" sẽ có vai trò chủ nhà và có thể đăng tin. Một thông báo sẽ được gửi tự động.`
    : verified
      ? `Sẽ huỷ xác minh và đưa "${name}" về vai trò người thuê. Người dùng nhận được thông báo và có thể nộp lại hồ sơ.`
      : `Sẽ xoá hồ sơ hiện tại. Người dùng nhận thông báo kèm lý do (nếu có) và có thể chỉnh sửa, gửi lại sau.`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <button
        type="button"
        aria-label="Đóng"
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
        onClick={loading ? undefined : onCancel}
      />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
        <div className="flex items-start gap-3 mb-4">
          <div
            className={`w-11 h-11 rounded-full flex items-center justify-center text-xl ${
              isApprove ? 'bg-blue-100 text-blue-600' : 'bg-red-100 text-red-600'
            }`}
          >
            {isApprove ? '✓' : '!'}
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-slate-900 mb-1">{title}</h3>
            <p className="text-sm text-slate-600">{description}</p>
          </div>
        </div>

        {!isApprove && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Lý do (tuỳ chọn — sẽ hiện trong thông báo gửi cho người dùng)
            </label>
            <textarea
              value={reason}
              onChange={(e) => onReasonChange(e.target.value)}
              rows={3}
              maxLength={500}
              placeholder="VD: Ảnh CMND không rõ, vui lòng chụp lại."
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
            />
            <p className="text-[11px] text-slate-400 mt-1 text-right">{reason.length}/500</p>
          </div>
        )}

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 px-4 py-2 text-sm font-medium disabled:opacity-50"
          >
            Huỷ
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`rounded-xl text-white px-4 py-2 text-sm font-semibold disabled:opacity-60 ${
              isApprove ? 'bg-blue-600 hover:bg-blue-700' : 'bg-red-600 hover:bg-red-700'
            }`}
          >
            {loading
              ? 'Đang xử lý...'
              : isApprove
                ? 'Xác nhận duyệt'
                : verified
                  ? 'Xác nhận thu hồi'
                  : 'Xác nhận từ chối'}
          </button>
        </div>
      </div>
    </div>
  );
}

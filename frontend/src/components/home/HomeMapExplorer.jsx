import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { MapPin, Search } from 'lucide-react';
import HomeMapLeaflet from './HomeMapLeaflet';
import { fetchRooms } from '../../services/roomApi';

const BUDGET_MAX = 50_000_000;
const BUDGET_STEP = 500_000;

function formatVndInput(n) {
  return new Intl.NumberFormat('vi-VN').format(Math.max(0, Math.round(n)));
}

function parseVndInput(s) {
  const digits = String(s).replace(/\D/g, '');
  if (!digits) return 0;
  return Math.min(BUDGET_MAX, parseInt(digits, 10));
}

function formatRelativePosted(iso) {
  const d = new Date(iso);
  const now = new Date();
  const mins = Math.floor((now - d) / (1000 * 60));
  if (mins < 1) return 'Vừa đăng';
  if (mins < 60) return `Đăng cách đây ${mins} phút trước`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `Đăng cách đây ${hrs} giờ trước`;
  const days = Math.floor(hrs / 24);
  return `Đăng cách đây ${days} ngày trước`;
}

function formatListPrice(price) {
  if (price >= 1_000_000) {
    const t = price / 1_000_000;
    const s = t % 1 === 0 ? String(Math.round(t)) : String(t.toFixed(1)).replace('.0', '');
    return `${s.replace('.', ',')} Trđ`;
  }
  return `${formatVndInput(price)} đ`;
}

export default function HomeMapExplorer() {
  const navigate = useNavigate();
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [locationQuery, setLocationQuery] = useState('');
  const [purpose, setPurpose] = useState('stays'); // stays | business
  const [budgetMin, setBudgetMin] = useState(0);
  const [budgetMax, setBudgetMax] = useState(30_000_000);
  const [selectedId, setSelectedId] = useState(null);
  const [mapPanUser, setMapPanUser] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const data = await fetchRooms({
          status: 'available',
          sort_by: 'created_at',
          sort_order: 'desc',
          limit: 80,
        });
        if (!cancelled) setRooms(data);
      } catch {
        if (!cancelled) setRooms([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    const q = locationQuery.trim().toLowerCase();
    return rooms.filter((r) => {
      if (purpose === 'stays' && r.type !== 'Phòng trọ') return false;
      if (purpose === 'business' && r.type === 'Phòng trọ') return false;
      if (r.price < budgetMin || r.price > budgetMax) return false;
      if (q) {
        const hay = `${r.title} ${r.address} ${r.city}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [rooms, locationQuery, purpose, budgetMin, budgetMax]);

  useEffect(() => {
    if (!filtered.length) {
      setSelectedId(null);
      setMapPanUser(false);
      return;
    }
    if (!filtered.some((r) => r.id === selectedId)) {
      setMapPanUser(false);
      setSelectedId(filtered[0].id);
    }
  }, [filtered, selectedId]);

  const selectRoomFromUser = (id) => {
    setMapPanUser(true);
    setSelectedId(id);
  };

  const onMinRange = (v) => {
    const n = Number(v);
    setBudgetMin((prev) => Math.min(n, budgetMax - BUDGET_STEP));
  };

  const onMaxRange = (v) => {
    const n = Number(v);
    setBudgetMax((prev) => Math.max(n, budgetMin + BUDGET_STEP));
  };

  return (
    <div className="flex flex-col lg:flex-row h-full min-h-0 bg-slate-100">
      {/* Sidebar */}
      <aside className="w-full lg:w-[400px] xl:w-[420px] flex-shrink-0 flex flex-col border-r border-slate-200 bg-white min-h-0 max-h-[42vh] lg:max-h-none lg:h-full shadow-sm z-10">
        <div className="p-4 space-y-5 overflow-y-auto flex-1">
          <div>
            <label className="flex items-center gap-2 text-sm font-semibold text-slate-800 mb-2">
              <MapPin className="w-4 h-4 text-blue-600" strokeWidth={2} />
              Địa điểm
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="search"
                value={locationQuery}
                onChange={(e) => setLocationQuery(e.target.value)}
                placeholder="Bạn muốn đến đâu?"
                className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-shadow"
              />
            </div>
          </div>

          <div>
            <p className="text-sm font-semibold text-slate-800 mb-2">Mục đích</p>
            <div className="flex flex-col gap-2">
              <label className="flex items-center gap-2 cursor-pointer text-sm text-slate-700">
                <input
                  type="radio"
                  name="purpose"
                  checked={purpose === 'stays'}
                  onChange={() => setPurpose('stays')}
                  className="text-blue-600 focus:ring-blue-500"
                />
                Thuê trọ
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-sm text-slate-700">
                <input
                  type="radio"
                  name="purpose"
                  checked={purpose === 'business'}
                  onChange={() => setPurpose('business')}
                  className="text-blue-600 focus:ring-blue-500"
                />
                Thuê kinh doanh
              </label>
            </div>
          </div>

          <div>
            <p className="text-sm font-semibold text-slate-800 mb-1">Ngân sách của bạn (VND)</p>
            <p className="text-xs text-slate-500 mb-3">
              {formatVndInput(budgetMin)} đ — {formatVndInput(budgetMax)} đ
            </p>
            <div className="space-y-2">
              <div className="flex gap-2 items-center text-xs text-slate-500">
                <span>0 đ</span>
                <span className="flex-1" />
                <span>50 Trđ</span>
              </div>
              <input
                type="range"
                min={0}
                max={BUDGET_MAX}
                step={BUDGET_STEP}
                value={budgetMin}
                onChange={(e) => onMinRange(e.target.value)}
                className="w-full h-2 accent-blue-600 rounded-lg cursor-pointer"
              />
              <input
                type="range"
                min={0}
                max={BUDGET_MAX}
                step={BUDGET_STEP}
                value={budgetMax}
                onChange={(e) => onMaxRange(e.target.value)}
                className="w-full h-2 accent-blue-600 rounded-lg cursor-pointer"
              />
            </div>
            <div className="grid grid-cols-2 gap-2 mt-3">
              <input
                type="text"
                inputMode="numeric"
                value={formatVndInput(budgetMin)}
                onChange={(e) => setBudgetMin(Math.min(parseVndInput(e.target.value), budgetMax - BUDGET_STEP))}
                className="px-3 py-2 rounded-lg border border-slate-200 text-sm"
              />
              <input
                type="text"
                inputMode="numeric"
                value={formatVndInput(budgetMax)}
                onChange={(e) => setBudgetMax(Math.max(parseVndInput(e.target.value), budgetMin + BUDGET_STEP))}
                className="px-3 py-2 rounded-lg border border-slate-200 text-sm"
              />
            </div>
          </div>

          <div>
            <p className="text-sm font-semibold text-slate-800 mb-3">Tin mới đăng</p>
            {loading && (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-28 rounded-xl bg-slate-100 animate-pulse" />
                ))}
              </div>
            )}
            {!loading && filtered.length === 0 && (
              <p className="text-sm text-slate-500 py-6 text-center">Không có tin phù hợp. Thử đổi bộ lọc.</p>
            )}
            <ul className="space-y-3">
              {!loading &&
                filtered.map((room) => (
                  <li key={room.id}>
                    <button
                      type="button"
                      onClick={() => selectRoomFromUser(room.id)}
                      className={`w-full text-left rounded-xl border transition-all overflow-hidden flex gap-3 p-2 ${
                        selectedId === room.id
                          ? 'border-blue-500 bg-blue-50/80 shadow-md ring-1 ring-blue-200'
                          : 'border-slate-100 bg-slate-50/50 hover:border-slate-200 hover:bg-white'
                      }`}
                    >
                      <div className="w-24 h-24 flex-shrink-0 rounded-lg bg-gradient-to-br from-slate-200 to-slate-300 overflow-hidden">
                        {room.images?.[0] ? (
                          <img src={room.images[0]} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-2xl">🏠</div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0 py-0.5 flex flex-col">
                        <p className="font-semibold text-slate-900 truncate text-sm">{room.title}</p>
                        <p className="text-xs text-slate-500 line-clamp-2 mt-0.5">{room.address}</p>
                        <p className="text-sm font-bold text-blue-700 mt-1">
                          {formatListPrice(room.price)}
                          {room.area > 0 && (
                            <span className="font-normal text-slate-600">
                              {' '}
                              · {room.area} m²
                            </span>
                          )}
                        </p>
                        <p className="text-[11px] text-slate-400 mt-auto">{formatRelativePosted(room.postedAt)}</p>
                        <span
                          className="mt-1 text-xs font-medium text-blue-600 hover:underline"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/room/${room.id}`);
                          }}
                        >
                          Xem chi tiết →
                        </span>
                      </div>
                    </button>
                  </li>
                ))}
            </ul>
          </div>
        </div>

        <div className="p-3 border-t border-slate-100 bg-slate-50 text-center text-xs text-slate-500">
          <Link to="/search" className="text-blue-600 font-medium hover:underline">
            Mở tìm kiếm nâng cao
          </Link>
        </div>
      </aside>

      {/* Map */}
      <section className="flex-1 min-h-[45vh] lg:min-h-0 relative bg-slate-900">
        <HomeMapLeaflet
          rooms={filtered}
          selectedId={selectedId}
          onSelectRoom={selectRoomFromUser}
          panToSelection={mapPanUser}
        />
      </section>
    </div>
  );
}

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Sparkles, Zap, Timer } from 'lucide-react';
import HotDealRoomCard from './HotDealRoomCard';

const BADGE_ROTATION = [
  { type: 'hot', label: '🔥 HOT' },
  { type: 'sale', label: '⚡ Giảm giá' },
  { type: 'featured', label: '⭐ Nổi bật' },
];

function badgeForIndex(i) {
  if (i === 0) return BADGE_ROTATION[0];
  if (i % 3 === 1) return BADGE_ROTATION[1];
  return BADGE_ROTATION[2];
}

function discountForRoom(room) {
  const seed = Number(room.id) || 1;
  return 5 + (seed % 11);
}

export default function HotDealsLoginModal({ open, rooms, loading, userName, onClose, onRoomClick }) {
  const navigate = useNavigate();
  const [visible, setVisible] = useState(false);
  const [countdown, setCountdown] = useState(15 * 60);

  useEffect(() => {
    if (!open) {
      setVisible(false);
      return undefined;
    }
    const t = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(t);
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const id = setInterval(() => setCountdown((c) => (c > 0 ? c - 1 : 0)), 1000);
    return () => clearInterval(id);
  }, [open]);

  if (!open) return null;

  const mins = String(Math.floor(countdown / 60)).padStart(2, '0');
  const secs = String(countdown % 60).padStart(2, '0');

  return (
    <div
      className={`fixed inset-0 z-[210] flex items-center justify-center p-3 sm:p-5 transition-opacity duration-300 ${
        visible ? 'opacity-100' : 'opacity-0'
      }`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="hot-deals-title"
    >
      <div
        className="absolute inset-0 bg-slate-900/55 backdrop-blur-md"
        onClick={onClose}
      />

      <div
        className={`relative w-full max-w-6xl max-h-[94vh] flex flex-col rounded-3xl overflow-hidden shadow-2xl shadow-blue-900/10 border border-slate-200/80 bg-slate-50 transition-all duration-500 ${
          visible ? 'scale-100 translate-y-0' : 'scale-95 translate-y-4'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="relative overflow-hidden px-5 sm:px-8 py-6 sm:py-8 text-white shrink-0">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600 via-blue-500 to-blue-400 hot-deals-shimmer" />
          <div className="absolute inset-0 opacity-25 hot-deals-sparkles pointer-events-none" />
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-blue-300/35 rounded-full blur-3xl" />
          <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-blue-700/30 rounded-full blur-2xl" />

          <div className="relative flex items-start justify-between gap-4">
            <div className="space-y-2">
              <p className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest bg-white/20 backdrop-blur px-3 py-1 rounded-full text-blue-50">
                <Zap size={14} className="text-blue-100" />
                Ưu đãi nổi bật TroHub
              </p>
              <h2 id="hot-deals-title" className="text-2xl sm:text-3xl font-black leading-tight drop-shadow-sm">
                {userName ? `${userName}, ` : ''}10 phòng HOT vừa mở!
              </h2>
              <p className="text-sm text-blue-50/95 max-w-lg">
                Giá tốt · Vị trí đẹp · Tiện ích đầy đủ — Khám phá ngay trước khi hết chỗ
              </p>
              <div className="flex flex-wrap items-center gap-3 pt-1">
                <span className="inline-flex items-center gap-1.5 text-xs font-bold bg-blue-800/30 px-3 py-1.5 rounded-lg text-white">
                  <Timer size={14} />
                  Ưu đãi kết thúc sau {mins}:{secs}
                </span>
                <span className="inline-flex items-center gap-1 text-xs font-semibold bg-white/15 px-3 py-1.5 rounded-lg text-blue-50">
                  <Sparkles size={14} />
                  {rooms.length} phòng nổi bật
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-2.5 rounded-full bg-white/15 hover:bg-white/25 backdrop-blur shrink-0 transition-colors text-white"
              aria-label="Đóng"
            >
              <X size={22} />
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-hidden bg-slate-50 min-h-0">
          <div className="h-full overflow-y-auto overflow-x-hidden px-4 sm:px-6 py-5">
            {loading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-64 rounded-2xl skeleton" />
                ))}
              </div>
            ) : rooms.length === 0 ? (
              <p className="text-center text-slate-500 py-16">Chưa có phòng nổi bật. Hãy quay lại sau!</p>
            ) : (
              <>
                <div className="hidden lg:grid lg:grid-cols-5 gap-4">
                  {rooms.map((room, i) => (
                    <HotDealRoomCard
                      key={room.id}
                      room={room}
                      index={i}
                      badge={badgeForIndex(i)}
                      discountPct={badgeForIndex(i).type === 'sale' ? discountForRoom(room) : 0}
                      onRoomClick={onRoomClick}
                    />
                  ))}
                </div>
                <div className="lg:hidden flex gap-4 overflow-x-auto pb-2 snap-x snap-mandatory scrollbar-hide hot-deals-scroll">
                  {rooms.map((room, i) => (
                    <div key={room.id} className="snap-center">
                      <HotDealRoomCard
                        room={room}
                        index={i}
                        badge={badgeForIndex(i)}
                        discountPct={badgeForIndex(i).type === 'sale' ? discountForRoom(room) : 0}
                        onRoomClick={onRoomClick}
                      />
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        <footer className="shrink-0 px-5 sm:px-6 py-4 bg-white border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-slate-500 text-center sm:text-left">
            🔒 Giá hiển thị mang tính tham khảo · Cập nhật theo tin đăng mới nhất
          </p>
          <div className="flex gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-sm font-medium hover:bg-slate-50"
            >
              Để sau
            </button>
            <button
              type="button"
              onClick={() => {
                onClose();
                navigate('/search');
              }}
              className="flex-1 sm:flex-none px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold shadow-md shadow-blue-600/25 hover:shadow-blue-600/35 hover:scale-[1.02] transition-all"
            >
              Khám phá tất cả →
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}


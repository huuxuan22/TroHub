import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatAddressWithCity } from '../../services/roomApi';

const BADGE_STYLES = {
  hot: 'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-md shadow-blue-500/35',
  sale: 'bg-gradient-to-r from-blue-500 to-sky-400 text-white shadow-md shadow-blue-400/35',
  featured: 'bg-gradient-to-r from-blue-700 to-blue-600 text-white shadow-md shadow-blue-600/35',
};

function formatPrice(price) {
  const n = Number(price) || 0;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace('.0', '')} triệu`;
  return `${Math.round(n / 1000)}k`;
}

export default function HotDealRoomCard({ room, badge, discountPct, index = 0, onRoomClick }) {
  const [imgError, setImgError] = useState(false);
  const navigate = useNavigate();
  const image = room.images?.[0];
  const badgeStyle = BADGE_STYLES[badge?.type] || BADGE_STYLES.featured;

  const goToDetail = () => {
    if (!room?.id) return;
    if (onRoomClick) {
      onRoomClick(room.id);
    } else {
      navigate(`/room/${room.id}`);
    }
  };

  return (
    <article
      role="link"
      tabIndex={0}
      className="hot-deal-card group flex-shrink-0 w-[min(100%,280px)] sm:w-[260px] lg:w-full bg-white rounded-2xl overflow-hidden border border-blue-100 shadow-sm hover:shadow-xl hover:shadow-blue-200/60 hover:-translate-y-2 hover:border-blue-200 transition-all duration-300 cursor-pointer"
      style={{ animationDelay: `${index * 70}ms` }}
      onClick={goToDetail}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          goToDetail();
        }
      }}
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-gradient-to-br from-slate-100 to-blue-50">
        {!imgError && image ? (
          <img
            src={image}
            alt={room.title}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-5xl bg-slate-100">🏠</div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/55 via-transparent to-transparent opacity-90" />
        <span className={`absolute top-3 left-3 text-[11px] font-extrabold uppercase tracking-wide px-2.5 py-1 rounded-full ${badgeStyle}`}>
          {badge?.label}
        </span>
        {discountPct > 0 && (
          <span className="absolute top-3 right-3 text-xs font-black bg-white text-blue-600 px-2 py-1 rounded-lg shadow-md">
            -{discountPct}%
          </span>
        )}
        <div className="absolute bottom-3 left-3 right-3">
          <p className="text-white font-extrabold text-lg drop-shadow-md">
            {formatPrice(room.price)}
            <span className="text-xs font-medium opacity-90">/tháng</span>
          </p>
        </div>
      </div>

      <div className="p-4 space-y-2.5">
        <h3 className="font-bold text-slate-800 text-sm leading-snug line-clamp-2 group-hover:text-blue-600 transition-colors">
          {room.title}
        </h3>
        <p className="text-xs text-slate-500 flex items-start gap-1 line-clamp-2">
          <span className="shrink-0">📍</span>
          <span>{formatAddressWithCity(room.address, room.city)}</span>
        </p>
        <p className="text-xs font-semibold text-blue-700 bg-blue-50 inline-flex px-2 py-0.5 rounded-md border border-blue-100">
          📐 {room.area} m²
        </p>
        {room.amenityHighlights?.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {room.amenityHighlights.map((a) => (
              <span
                key={a.id}
                className="text-[10px] font-medium bg-slate-50 text-slate-700 px-2 py-0.5 rounded-full border border-slate-200"
              >
                {a.icon} {a.label}
              </span>
            ))}
          </div>
        )}
        <button
          type="button"
          className="w-full mt-1 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold uppercase tracking-wide opacity-100 sm:opacity-0 sm:group-hover:opacity-100 translate-y-0 sm:translate-y-1 sm:group-hover:translate-y-0 transition-all duration-300 shadow-md shadow-blue-600/30"
          onClick={(e) => {
            e.stopPropagation();
            goToDetail();
          }}
        >
          Xem ngay →
        </button>
      </div>
    </article>
  );
}


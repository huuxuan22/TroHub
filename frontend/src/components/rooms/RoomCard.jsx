import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Badge from '../common/Badge';
import StarRating from '../common/StarRating';
import { AMENITIES } from '../../data/mockData';

function formatPrice(price) {
  if (price >= 1000000) return `${(price / 1000000).toFixed(1).replace('.0', '')} triệu`;
  return `${(price / 1000).toFixed(0)}k`;
}

function formatDate(dateStr) {
  const d = new Date(dateStr);
  const now = new Date();
  const diff = Math.floor((now - d) / (1000 * 60 * 60 * 24));
  if (diff === 0) return 'Hôm nay';
  if (diff === 1) return 'Hôm qua';
  return `${diff} ngày trước`;
}

export default function RoomCard({ room, featured = false }) {
  const [saved, setSaved] = useState(false);
  const [imgError, setImgError] = useState(false);
  const navigate = useNavigate();

  const amenityLabels = (room.amenities || [])
    .slice(0, 3)
    .map((id) => AMENITIES.find((a) => a.id === id))
    .filter(Boolean);

  return (
    <div
      className={`group bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer ${featured ? 'ring-2 ring-blue-200' : ''}`}
      onClick={() => navigate(`/room/${room.id}`)}
    >
      {/* Image */}
      <div className="relative aspect-[4/3] overflow-hidden bg-gray-100">
        {!imgError ? (
          <img
            src={room.images?.[0]}
            alt={room.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-6xl bg-gradient-to-br from-blue-50 to-indigo-100">
            🏠
          </div>
        )}

        {/* Overlays */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

        {/* Badges */}
        <div className="absolute top-3 left-3 flex flex-col gap-1.5">
          {room.isFeatured && (
            <span className="bg-yellow-400 text-yellow-900 text-xs font-semibold px-2 py-0.5 rounded-full">
              ⭐ Nổi bật
            </span>
          )}
          {room.isNew && (
            <span className="bg-green-500 text-white text-xs font-semibold px-2 py-0.5 rounded-full">
              Mới
            </span>
          )}
          {room.isVerified && (
            <span className="bg-blue-600 text-white text-xs font-semibold px-2 py-0.5 rounded-full">
              ✓ Xác minh
            </span>
          )}
        </div>

        {/* Save button */}
        <button
          className={`absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 ${
            saved ? 'bg-red-500 text-white' : 'bg-white/90 text-gray-600 hover:bg-red-50 hover:text-red-500'
          }`}
          onClick={(e) => { e.stopPropagation(); setSaved(!saved); }}
        >
          {saved ? '❤️' : '🤍'}
        </button>

        {/* AI Score */}
        {room.aiScore && (
          <div className="absolute bottom-3 right-3 bg-white/95 backdrop-blur-sm rounded-lg px-2 py-1 flex items-center gap-1">
            <span className="text-xs">🤖</span>
            <span className="text-xs font-bold text-blue-600">{room.aiScore}%</span>
          </div>
        )}

        {/* Image count */}
        {room.images?.length > 1 && (
          <div className="absolute bottom-3 left-3 bg-black/50 text-white text-xs rounded-full px-2 py-0.5">
            📷 {room.images.length}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Type badge */}
        <div className="flex items-center justify-between mb-2">
          <Badge variant="blue" className="text-xs">{room.type}</Badge>
          <div className="flex items-center gap-1">
            <StarRating rating={room.rating} />
            <span className="text-xs text-gray-500">({room.reviewCount})</span>
          </div>
        </div>

        {/* Title */}
        <h3 className="font-semibold text-gray-900 text-sm leading-tight mb-2 line-clamp-2 group-hover:text-blue-600 transition-colors">
          {room.title}
        </h3>

        {/* Address */}
        <p className="text-xs text-gray-500 mb-3 flex items-center gap-1">
          <span>📍</span>
          <span className="truncate">{room.address}, {room.city}</span>
        </p>

        {/* AI Highlight */}
        {room.aiHighlight && (
          <div className="bg-blue-50 border border-blue-100 rounded-lg px-3 py-2 mb-3">
            <p className="text-xs text-blue-700 font-medium">
              <span className="mr-1">🤖</span>{room.aiHighlight}
            </p>
          </div>
        )}

        {/* Amenities */}
        {amenityLabels.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {amenityLabels.map((a) => (
              <span key={a.id} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                {a.icon} {a.label}
              </span>
            ))}
            {(room.amenities?.length || 0) > 3 && (
              <span className="text-xs text-blue-500">+{room.amenities.length - 3} khác</span>
            )}
          </div>
        )}

        {/* Price & Info */}
        <div className="flex items-end justify-between pt-3 border-t border-gray-100">
          <div>
            <p className="text-xl font-bold text-blue-600">
              {formatPrice(room.price)}
              <span className="text-xs font-normal text-gray-400">/tháng</span>
            </p>
            <p className="text-xs text-gray-400">{room.area} m²</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-400">{formatDate(room.postedAt)}</p>
            <p className="text-xs text-gray-500 mt-0.5">{room.landlord?.name}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

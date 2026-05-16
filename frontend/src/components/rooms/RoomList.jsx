import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { isAdminUser } from '../../utils/userRoles';
import FavoriteToggle from '../favorites/FavoriteToggle';
import RoomCard from './RoomCard';
import { formatAddressWithCity } from '../../services/roomApi';
import { SkeletonCard } from '../common/LoadingSpinner';

export default function RoomList({ rooms = [], loading = false, totalCount = 0 }) {
  const [viewMode, setViewMode] = useState('grid');

  if (loading) {
    return (
      <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-5">
        {Array(6).fill(0).map((_, i) => <SkeletonCard key={i} />)}
      </div>
    );
  }

  if (!rooms.length) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="text-7xl mb-4">🔍</div>
        <h3 className="text-xl font-bold text-gray-900 mb-2">Không tìm thấy phòng phù hợp</h3>
        <p className="text-gray-500 max-w-sm">
          Thử thay đổi từ khóa tìm kiếm hoặc bộ lọc để tìm được phòng ưng ý hơn.
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <p className="text-sm text-gray-600">
          Tìm thấy <span className="font-semibold text-gray-900">{totalCount || rooms.length}</span> phòng trọ
        </p>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-2 rounded-lg transition-colors ${viewMode === 'grid' ? 'bg-blue-100 text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
            title="Dạng lưới"
          >
            ⊞
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-2 rounded-lg transition-colors ${viewMode === 'list' ? 'bg-blue-100 text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
            title="Dạng danh sách"
          >
            ☰
          </button>
        </div>
      </div>

      {viewMode === 'grid' ? (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-5">
          {rooms.map((room) => <RoomCard key={room.id} room={room} />)}
        </div>
      ) : (
        <div className="space-y-4">
          {rooms.map((room) => <RoomCardHorizontal key={room.id} room={room} />)}
        </div>
      )}
    </div>
  );
}

function RoomCardHorizontal({ room }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const hideFavorites = isAdminUser(user);

  const price = room.price >= 1000000
    ? `${(room.price / 1000000).toFixed(1).replace('.0', '')} triệu`
    : `${room.price / 1000}k`;

  return (
    <div
      className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer overflow-hidden flex"
      onClick={() => navigate(`/room/${room.id}`)}
    >
      <div className="w-48 h-36 flex-shrink-0 overflow-hidden bg-gray-100">
        <img
          src={room.images?.[0]}
          alt={room.title}
          className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
          onError={(e) => { e.target.style.display = 'none'; }}
        />
      </div>
      <div className="flex-1 p-4 flex flex-col justify-between min-w-0">
        <div>
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold text-gray-900 text-sm line-clamp-2 hover:text-blue-600 transition-colors">
              {room.title}
            </h3>
            {!hideFavorites && (
              <FavoriteToggle roomId={room.id} variant="bare" className="flex-shrink-0 text-xl min-w-[2rem]" />
            )}
          </div>
          <p className="text-xs text-gray-500 mt-1 truncate">📍 {formatAddressWithCity(room.address, room.city)}</p>
        </div>
        <div className="flex items-end justify-between">
          <div>
            <p className="text-lg font-bold text-blue-600">
              {price}
              <span className="text-xs font-normal text-gray-400">/tháng</span>
            </p>
            <p className="text-xs text-gray-400">{room.area} m²</p>
          </div>
          {room.aiScore && (
            <div className="flex items-center gap-1 bg-blue-50 text-blue-600 rounded-lg px-2 py-1">
              <span className="text-xs">🤖</span>
              <span className="text-xs font-bold">{room.aiScore}%</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

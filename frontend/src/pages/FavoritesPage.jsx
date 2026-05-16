import React, { useCallback, useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import RequireAuth from '../components/auth/RequireAuth';
import RoomCard from '../components/rooms/RoomCard';
import { useAuth } from '../contexts/AuthContext';
import { useFavorites } from '../contexts/FavoritesContext';
import { fetchMyFavoritesRaw } from '../services/favoritesApi';
import { mapRoomFromApi } from '../services/roomApi';
import { isAdminUser } from '../utils/userRoles';

function FavoritesContent() {
  const { user } = useAuth();
  const { refreshFavoriteIds } = useFavorites();
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const rows = await fetchMyFavoritesRaw();
      setRooms(rows.map((row) => mapRoomFromApi(row.room)).filter((r) => r && r.id));
    } catch (e) {
      setError(e.message || 'Could not load saved rooms.');
      setRooms([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAdminUser(user)) {
      setLoading(false);
      return;
    }
    load();
  }, [load, user]);

  if (isAdminUser(user)) {
    return <Navigate to="/admin" replace />;
  }

  return (
    <div className="min-h-screen bg-slate-50 pt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Phòng đã lưu</h1>
            <p className="text-gray-500 mt-1 text-sm">
              Tin bạn đánh dấu yêu thích, đồng bộ khi đăng nhập.
            </p>
          </div>
          <Link
            to="/search"
            className="text-blue-600 hover:text-blue-700 text-sm font-medium inline-flex items-center gap-1 shrink-0"
          >
            Tiếp tục tìm phòng <span aria-hidden>→</span>
          </Link>
        </div>

        {loading && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((k) => (
              <div key={k} className="h-80 bg-white rounded-2xl border border-gray-100 animate-pulse" />
            ))}
          </div>
        )}

        {!loading && error && (
          <div className="bg-white border border-red-100 text-red-700 rounded-xl px-4 py-3 text-sm">
            {error}
          </div>
        )}

        {!loading && !error && rooms.length === 0 && (
          <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-12 text-center">
            <div className="text-5xl mb-4">🤍</div>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Chưa có phòng yêu thích</h2>
            <p className="text-gray-500 text-sm max-w-md mx-auto mb-6">
              Chọn biểu tượng tim trên tin để lưu tại đây.
            </p>
            <Link
              to="/search"
              className="inline-flex items-center justify-center bg-blue-600 text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              Khám phá phòng trọ
            </Link>
          </div>
        )}

        {!loading && !error && rooms.length > 0 && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {rooms.map((room) => (
              <RoomCard key={room.id} room={room} />
            ))}
          </div>
        )}

        {!loading && rooms.length > 0 && (
          <p className="text-center text-xs text-gray-400 mt-10">
            <button
              type="button"
              onClick={() => {
                refreshFavoriteIds();
                load();
              }}
              className="text-blue-600 hover:underline"
            >
              Làm mới danh sách
            </button>
          </p>
        )}
      </div>
    </div>
  );
}

export default function FavoritesPage() {
  return (
    <RequireAuth>
      <FavoritesContent />
    </RequireAuth>
  );
}

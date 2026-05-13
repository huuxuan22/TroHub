import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useFavorites } from '../../contexts/FavoritesContext';

const LAYOUT = {
  card: 'absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center',
  detail: 'absolute top-4 right-4 w-10 h-10 rounded-full flex items-center justify-center shadow-sm',
  bare: 'inline-flex items-center justify-center p-1 rounded-lg',
};

export default function FavoriteToggle({
  roomId,
  variant = 'card',
  stopPropagation = true,
  className = '',
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { isFavorite, toggleFavorite, busyRoomIds } = useFavorites();

  const id = Number(roomId);
  const saved = isFavorite(id);
  const busy = busyRoomIds.has(id);

  const stateCls = saved
    ? 'bg-red-500 text-white border border-red-500'
    : variant === 'bare'
      ? 'text-gray-500 hover:text-red-500 hover:bg-red-50'
      : 'bg-white/90 text-gray-600 hover:bg-red-50 hover:text-red-500 border border-transparent';

  const layoutCls = LAYOUT[variant] || LAYOUT.card;

  const handleClick = async (e) => {
    if (stopPropagation) e.stopPropagation();
    if (!user) {
      const from = `${location.pathname}${location.search || ''}`;
      navigate('/login', { state: { from } });
      return;
    }
    try {
      await toggleFavorite(id);
    } catch {
      //
    }
  };

  return (
    <button
      type="button"
      aria-label={saved ? 'Remove from favorites' : 'Add to favorites'}
      title={saved ? 'Bỏ yêu thích' : 'Thêm yêu thích'}
      disabled={busy}
      onClick={handleClick}
      className={`${layoutCls} ${stateCls} transition-all duration-200 disabled:opacity-50 ${className}`.trim()}
    >
      <span className="leading-none">{saved ? '❤️' : '🤍'}</span>
    </button>
  );
}

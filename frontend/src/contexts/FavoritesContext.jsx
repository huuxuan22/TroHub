import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useAuth } from './AuthContext';
import { addFavoriteRoom, fetchFavoriteRoomIds, removeFavoriteRoom } from '../services/favoritesApi';

const FavoritesContext = createContext(null);

export function FavoritesProvider({ children }) {
  const { user, authLoading } = useAuth();
  const [favoriteRoomIds, setFavoriteRoomIds] = useState(() => new Set());
  const [idsLoading, setIdsLoading] = useState(false);
  const [busyRoomIds, setBusyRoomIds] = useState(() => new Set());

  const refreshFavoriteIds = useCallback(async () => {
    if (!user) {
      setFavoriteRoomIds(new Set());
      return;
    }
    setIdsLoading(true);
    try {
      const ids = await fetchFavoriteRoomIds();
      setFavoriteRoomIds(new Set(ids));
    } catch {
      setFavoriteRoomIds(new Set());
    } finally {
      setIdsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (authLoading) return;
    refreshFavoriteIds();
  }, [authLoading, user?.id, refreshFavoriteIds]);

  const isFavorite = useCallback(
    (roomId) => favoriteRoomIds.has(Number(roomId)),
    [favoriteRoomIds],
  );

  const toggleFavorite = useCallback(
    async (roomId) => {
      if (!user) {
        return { needAuth: true };
      }
      const id = Number(roomId);
      if (!Number.isFinite(id) || id < 1) {
        return { needAuth: false, error: true };
      }

      setBusyRoomIds((prev) => new Set(prev).add(id));
      try {
        if (favoriteRoomIds.has(id)) {
          await removeFavoriteRoom(id);
          setFavoriteRoomIds((prev) => {
            const next = new Set(prev);
            next.delete(id);
            return next;
          });
          return { needAuth: false, favorited: false };
        }
        await addFavoriteRoom(id);
        setFavoriteRoomIds((prev) => new Set(prev).add(id));
        return { needAuth: false, favorited: true };
      } finally {
        setBusyRoomIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      }
    },
    [user, favoriteRoomIds],
  );

  const value = useMemo(
    () => ({
      favoriteRoomIds,
      idsLoading,
      busyRoomIds,
      isFavorite,
      toggleFavorite,
      refreshFavoriteIds,
    }),
    [favoriteRoomIds, idsLoading, busyRoomIds, isFavorite, toggleFavorite, refreshFavoriteIds],
  );

  return (
    <FavoritesContext.Provider value={value}>
      {children}
    </FavoritesContext.Provider>
  );
}

export function useFavorites() {
  const ctx = useContext(FavoritesContext);
  if (!ctx) throw new Error('useFavorites must be used inside FavoritesProvider');
  return ctx;
}

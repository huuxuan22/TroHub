import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import RoomFilter from '../components/rooms/RoomFilter';
import RoomList from '../components/rooms/RoomList';
import AISearchBar from '../components/home/AISearchBar';
import Pagination from '../components/common/Pagination';
import { fetchRooms } from '../services/roomApi';
import { recordSearchHistory } from '../services/searchHistoryApi';
import useGeolocation, { formatDistanceKm, haversineDistanceKm } from '../utils/useGeolocation';

const PRICE_RANGES = [
  { min: 0, max: 1000000 },
  { min: 1000000, max: 2000000 },
  { min: 2000000, max: 3000000 },
  { min: 3000000, max: 5000000 },
  { min: 5000000, max: 10000000 },
  { min: 10000000, max: null },
];

const PAGE_SIZE = 6;

export default function SearchPage() {
  const [searchParams] = useSearchParams();
  const [rooms, setRooms] = useState([]);
  const [totalServer, setTotalServer] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showFilter, setShowFilter] = useState(false);
  const [page, setPage] = useState(1);
  const resultsTopRef = useRef(null);
  const [filters, setFilters] = useState({
    type: '',
    city: '',
    priceRange: null,
    amenities: [],
    minArea: '',
    maxArea: '',
    verified: false,
    sortBy: 'newest',
  });
  const query = searchParams.get('q') || '';
  const city = searchParams.get('city') || '';

  const [nearMe, setNearMe] = useState(null); // {latitude, longitude} | null
  const [locationError, setLocationError] = useState('');
  const { requestLocation, loading: locating } = useGeolocation();

  const enableNearMe = async () => {
    setLocationError('');
    try {
      const pos = await requestLocation();
      setNearMe({ latitude: pos.latitude, longitude: pos.longitude });
    } catch (err) {
      setLocationError(err.message || 'Không lấy được vị trí.');
    }
  };

  const disableNearMe = () => {
    setNearMe(null);
    setLocationError('');
  };

  // Tính khoảng cách & sắp theo gần nhất khi có toạ độ user.
  const orderedRooms = useMemo(() => {
    if (!nearMe) return rooms;
    return rooms
      .map((r) => ({
        ...r,
        _distanceKm:
          r.latitude != null && r.longitude != null
            ? haversineDistanceKm(nearMe.latitude, nearMe.longitude, r.latitude, r.longitude)
            : Infinity,
      }))
      .sort((a, b) => a._distanceKm - b._distanceKm);
  }, [rooms, nearMe]);

  const roomsWithDistance = useMemo(() => {
    if (!nearMe) return orderedRooms;
    return orderedRooms.map((r) =>
      Number.isFinite(r._distanceKm)
        ? { ...r, distanceLabel: formatDistanceKm(r._distanceKm) }
        : r,
    );
  }, [orderedRooms, nearMe]);

  useEffect(() => {
    const loadRooms = async () => {
      setLoading(true);
      setError('');
      try {
        const range = filters.priceRange !== null && filters.priceRange !== undefined ? PRICE_RANGES[filters.priceRange] : null;
        const keyword = [query, city, filters.city].filter(Boolean).join(' ').trim();

        const sortByMap = {
          newest: { sort_by: 'created_at', sort_order: 'desc' },
          price_asc: { sort_by: 'price', sort_order: 'asc' },
          price_desc: { sort_by: 'price', sort_order: 'desc' },
        };
        const sortParams = sortByMap[filters.sortBy] || sortByMap.newest;

        const { rooms: fetched, total } = await fetchRooms({
          keyword,
          min_price: range?.min,
          max_price: range?.max,
          ...sortParams,
          skip: (page - 1) * PAGE_SIZE,
          limit: PAGE_SIZE,
        });
        let results = fetched;

        if (filters.type) {
          results = results.filter((r) => r.type === filters.type);
        }
        if (filters.verified) {
          results = results.filter((r) => r.isVerified);
        }
        if (filters.minArea) {
          results = results.filter((r) => r.area >= Number(filters.minArea));
        }
        if (filters.maxArea) {
          results = results.filter((r) => r.area <= Number(filters.maxArea));
        }
        setRooms(results);
        setTotalServer(total ?? fetched.length);

        if (page === 1) {
          recordSearchHistory({
            keyword: query || undefined,
            city: city || filters.city || undefined,
            filters: {
              type: filters.type || undefined,
              priceRange: filters.priceRange,
              amenities: filters.amenities,
              minArea: filters.minArea || undefined,
              maxArea: filters.maxArea || undefined,
              verified: filters.verified,
              sortBy: filters.sortBy,
              min_price: range?.min,
              max_price: range?.max,
              near_me: Boolean(nearMe),
              query: query || undefined,
            },
            result_count: total ?? results.length,
          });
        }
      } catch (err) {
        setError('Không thể tải dữ liệu từ server. Vui lòng thử lại.');
        setRooms([]);
        setTotalServer(0);
      } finally {
        setLoading(false);
      }
    };

    loadRooms();
  }, [query, city, filters, page]);

  // Reset về trang 1 khi đổi từ khoá / city / bộ lọc — tránh hiển thị trang
  // trống do số tổng giảm đi.
  useEffect(() => {
    setPage(1);
  }, [query, city, filters]);

  const totalPages = Math.max(1, Math.ceil(totalServer / PAGE_SIZE));

  const handleFilterChange = (nextFilters) => {
    setFilters(nextFilters);
  };

  const handlePageChange = (next) => {
    setPage(next);
    if (resultsTopRef.current) {
      const top = resultsTopRef.current.getBoundingClientRect().top + window.scrollY - 80;
      window.scrollTo({ top, behavior: 'smooth' });
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const renderRoomList = () => {
    if (error) {
      return (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
          {error}
        </div>
      );
    }
    return <RoomList rooms={roomsWithDistance} loading={loading} totalCount={roomsWithDistance.length} />;
  };

  return (
    <div className="min-h-screen bg-slate-50 pt-16">
      {/* Top search bar */}
      <div className="bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <AISearchBar compact />
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb + Title */}
        <div className="mb-6">
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
            <a href="/" className="hover:text-blue-600">Trang chủ</a>
            <span>/</span>
            <span className="text-gray-900">Tìm kiếm</span>
            {city && <><span>/</span><span className="text-gray-900">{city}</span></>}
          </div>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {nearMe
                  ? 'Phòng gần bạn nhất'
                  : query
                    ? `Kết quả cho "${query}"`
                    : city
                      ? `Phòng trọ tại ${city}`
                      : 'Tất cả phòng trọ'}
              </h1>
              {!loading && (
                <p className="text-sm text-gray-500 mt-1">
                  {nearMe ? 'Sắp xếp theo khoảng cách · ' : ''}
                  <span className="font-medium text-blue-600">{totalServer}</span> phòng phù hợp
                  {totalPages > 1 && !nearMe && (
                    <span className="text-gray-400"> · Trang {page}/{totalPages}</span>
                  )}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {nearMe ? (
                <button
                  type="button"
                  onClick={disableNearMe}
                  className="inline-flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 px-3 py-2 text-sm font-semibold hover:bg-emerald-100"
                  title="Tắt lọc theo vị trí hiện tại"
                >
                  ✓ Đang dùng vị trí của bạn
                  <span className="text-emerald-500">·</span>
                  <span className="text-xs underline">Tắt</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={enableNearMe}
                  disabled={locating}
                  className="inline-flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 text-blue-700 px-3 py-2 text-sm font-semibold hover:bg-blue-100 disabled:opacity-60"
                  title="Sắp xếp danh sách theo khoảng cách từ vị trí hiện tại"
                >
                  {locating ? '⏳ Đang lấy GPS...' : '📍 Phòng gần tôi'}
                </button>
              )}
              <button
                onClick={() => setShowFilter(!showFilter)}
                className="lg:hidden flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium"
              >
                🔧 Bộ lọc
              </button>
            </div>
          </div>
          {locationError && (
            <p className="mt-3 text-sm bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2">
              {locationError}
            </p>
          )}
        </div>

        {/* AI Analysis Banner */}
        {query && !loading && (
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 mb-6 flex items-start gap-3">
            <span className="text-2xl flex-shrink-0">🤖</span>
            <div>
              <p className="font-semibold text-blue-800 text-sm mb-1">AI đã phân tích yêu cầu của bạn</p>
              <p className="text-blue-700 text-sm">
                Tìm thấy <strong>{rooms.length}</strong> phòng phù hợp với "{query}".
                Các phòng được sắp xếp theo mức độ phù hợp AI Score từ cao đến thấp.
              </p>
            </div>
          </div>
        )}

        <div className="flex gap-6">
          {/* Sidebar Filter - Desktop */}
          <div className="hidden lg:block w-72 flex-shrink-0">
            <RoomFilter onFilterChange={handleFilterChange} />
          </div>

          {/* Mobile filter overlay */}
          {showFilter && (
            <div className="fixed inset-0 z-50 lg:hidden">
              <div className="absolute inset-0 bg-black/50" onClick={() => setShowFilter(false)} />
              <div className="absolute right-0 top-0 bottom-0 w-80 bg-white overflow-y-auto">
                <div className="p-4 border-b flex items-center justify-between">
                  <h3 className="font-bold text-gray-900">Bộ lọc</h3>
                  <button onClick={() => setShowFilter(false)} className="text-gray-500 text-xl">✕</button>
                </div>
                <RoomFilter onFilterChange={(f) => { handleFilterChange(f); setShowFilter(false); }} />
              </div>
            </div>
          )}

          {/* Results */}
          <div className="flex-1 min-w-0" ref={resultsTopRef}>
            {renderRoomList()}

            {/* Pagination — ẩn khi đang chế độ "Phòng gần tôi" vì kết quả
                đang được sắp theo khoảng cách trên trang hiện tại. */}
            {!loading && !error && totalServer > 0 && !nearMe && (
              <Pagination
                currentPage={page}
                totalPages={totalPages}
                onPageChange={handlePageChange}
                className="mt-10"
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

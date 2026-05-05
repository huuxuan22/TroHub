import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import RoomFilter from '../components/rooms/RoomFilter';
import RoomList from '../components/rooms/RoomList';
import AISearchBar from '../components/home/AISearchBar';
import { MOCK_ROOMS } from '../data/mockData';

export default function SearchPage() {
  const [searchParams] = useSearchParams();
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showFilter, setShowFilter] = useState(false);
  const query = searchParams.get('q') || '';
  const city = searchParams.get('city') || '';

  useEffect(() => {
    setLoading(true);
    const timer = setTimeout(() => {
      let results = [...MOCK_ROOMS];
      if (city) results = results.filter((r) => r.city.includes(city));
      setRooms(results);
      setLoading(false);
    }, 600);
    return () => clearTimeout(timer);
  }, [query, city]);

  const handleFilterChange = (filters) => {
    let results = [...MOCK_ROOMS];
    if (filters.city) results = results.filter((r) => r.city === filters.city);
    if (filters.type) results = results.filter((r) => r.type === filters.type);
    if (filters.verified) results = results.filter((r) => r.isVerified);
    if (filters.priceRange !== null && filters.priceRange !== undefined) {
      const range = [
        { min: 0, max: 1000000 },
        { min: 1000000, max: 2000000 },
        { min: 2000000, max: 3000000 },
        { min: 3000000, max: 5000000 },
        { min: 5000000, max: 10000000 },
        { min: 10000000, max: null },
      ][filters.priceRange];
      if (range) results = results.filter((r) => r.price >= range.min && (!range.max || r.price <= range.max));
    }
    if (filters.amenities?.length) {
      results = results.filter((r) => filters.amenities.every((a) => r.amenities?.includes(a)));
    }
    if (filters.sortBy === 'price_asc') results.sort((a, b) => a.price - b.price);
    else if (filters.sortBy === 'price_desc') results.sort((a, b) => b.price - a.price);
    else if (filters.sortBy === 'rating') results.sort((a, b) => b.rating - a.rating);
    else if (filters.sortBy === 'ai_score') results.sort((a, b) => (b.aiScore || 0) - (a.aiScore || 0));
    setRooms(results);
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
                {query ? `Kết quả cho "${query}"` : city ? `Phòng trọ tại ${city}` : 'Tất cả phòng trọ'}
              </h1>
              {!loading && (
                <p className="text-sm text-gray-500 mt-1">
                  AI đề xuất <span className="font-medium text-blue-600">{rooms.length}</span> phòng phù hợp
                </p>
              )}
            </div>
            {/* Mobile filter toggle */}
            <button
              onClick={() => setShowFilter(!showFilter)}
              className="lg:hidden flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium"
            >
              🔧 Bộ lọc
            </button>
          </div>
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
          <div className="flex-1 min-w-0">
            <RoomList rooms={rooms} loading={loading} totalCount={rooms.length} />

            {/* Pagination */}
            {!loading && rooms.length > 0 && (
              <div className="flex items-center justify-center gap-2 mt-10">
                <button className="w-10 h-10 rounded-lg border border-gray-200 text-gray-500 hover:border-blue-300 hover:text-blue-600 transition-colors">
                  ‹
                </button>
                {[1, 2, 3, 4, 5].map((p) => (
                  <button
                    key={p}
                    className={`w-10 h-10 rounded-lg text-sm font-medium transition-colors ${
                      p === 1
                        ? 'bg-blue-600 text-white'
                        : 'border border-gray-200 text-gray-600 hover:border-blue-300 hover:text-blue-600'
                    }`}
                  >
                    {p}
                  </button>
                ))}
                <button className="w-10 h-10 rounded-lg border border-gray-200 text-gray-500 hover:border-blue-300 hover:text-blue-600 transition-colors">
                  ›
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

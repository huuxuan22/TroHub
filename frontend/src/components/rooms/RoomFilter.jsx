import React, { useState } from 'react';
import { CATEGORIES, PRICE_RANGES, AMENITIES, CITIES } from '../../data/mockData';

export default function RoomFilter({ onFilterChange }) {
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

  const update = (key, value) => {
    const next = { ...filters, [key]: value };
    setFilters(next);
    onFilterChange?.(next);
  };

  const toggleAmenity = (id) => {
    const next = filters.amenities.includes(id)
      ? filters.amenities.filter((a) => a !== id)
      : [...filters.amenities, id];
    update('amenities', next);
  };

  const reset = () => {
    const empty = { type: '', city: '', priceRange: null, amenities: [], minArea: '', maxArea: '', verified: false, sortBy: 'newest' };
    setFilters(empty);
    onFilterChange?.(empty);
  };

  const activeCount = [filters.type, filters.city, filters.priceRange, ...filters.amenities, filters.minArea, filters.verified].filter(Boolean).length;

  return (
    <aside className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden sticky top-20">
      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
        <h3 className="font-bold text-gray-900 flex items-center gap-2">
          🔧 Bộ lọc
          {activeCount > 0 && (
            <span className="bg-blue-600 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
              {activeCount}
            </span>
          )}
        </h3>
        {activeCount > 0 && (
          <button onClick={reset} className="text-xs text-red-500 hover:text-red-600 font-medium">
            Xóa tất cả
          </button>
        )}
      </div>

      <div className="p-5 space-y-6 max-h-[calc(100vh-140px)] overflow-y-auto">
        {/* Sort */}
        <FilterSection title="Sắp xếp theo">
          <select
            value={filters.sortBy}
            onChange={(e) => update('sortBy', e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            <option value="newest">Mới nhất</option>
            <option value="price_asc">Giá thấp đến cao</option>
            <option value="price_desc">Giá cao đến thấp</option>
            <option value="rating">Đánh giá cao nhất</option>
            <option value="ai_score">AI Score cao nhất</option>
          </select>
        </FilterSection>

        {/* City */}
        <FilterSection title="Tỉnh/Thành phố">
          <select
            value={filters.city}
            onChange={(e) => update('city', e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            <option value="">Tất cả</option>
            {CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </FilterSection>

        {/* Type */}
        <FilterSection title="Loại hình">
          <div className="grid grid-cols-2 gap-2">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => update('type', filters.type === cat.label ? '' : cat.label)}
                className={`text-xs text-left px-3 py-2 rounded-lg border transition-all duration-150 ${
                  filters.type === cat.label
                    ? 'border-blue-500 bg-blue-50 text-blue-700 font-medium'
                    : 'border-gray-200 text-gray-600 hover:border-blue-300 hover:bg-blue-50'
                }`}
              >
                {cat.icon} {cat.label}
              </button>
            ))}
          </div>
        </FilterSection>

        {/* Price */}
        <FilterSection title="Mức giá">
          <div className="space-y-1.5">
            {PRICE_RANGES.map((range, i) => (
              <button
                key={i}
                onClick={() => update('priceRange', filters.priceRange === i ? null : i)}
                className={`w-full text-left text-sm px-3 py-2 rounded-lg border transition-all duration-150 ${
                  filters.priceRange === i
                    ? 'border-blue-500 bg-blue-50 text-blue-700 font-medium'
                    : 'border-gray-200 text-gray-600 hover:border-blue-300'
                }`}
              >
                {range.label}
              </button>
            ))}
          </div>
        </FilterSection>

        {/* Area */}
        <FilterSection title="Diện tích (m²)">
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={filters.minArea}
              onChange={(e) => update('minArea', e.target.value)}
              placeholder="Từ"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <span className="text-gray-400 text-sm">—</span>
            <input
              type="number"
              value={filters.maxArea}
              onChange={(e) => update('maxArea', e.target.value)}
              placeholder="Đến"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </FilterSection>

        {/* Amenities */}
        <FilterSection title="Tiện ích">
          <div className="grid grid-cols-2 gap-2">
            {AMENITIES.map((a) => (
              <button
                key={a.id}
                onClick={() => toggleAmenity(a.id)}
                className={`text-xs text-left px-3 py-2 rounded-lg border transition-all duration-150 ${
                  filters.amenities.includes(a.id)
                    ? 'border-blue-500 bg-blue-50 text-blue-700 font-medium'
                    : 'border-gray-200 text-gray-600 hover:border-blue-300'
                }`}
              >
                {a.icon} {a.label}
              </button>
            ))}
          </div>
        </FilterSection>

        {/* Verified */}
        <div className="flex items-center justify-between py-2 border-t border-gray-100">
          <label className="text-sm font-medium text-gray-700 flex items-center gap-2 cursor-pointer">
            <span>✓</span> Chỉ xem tin đã xác minh
          </label>
          <button
            onClick={() => update('verified', !filters.verified)}
            className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${filters.verified ? 'bg-blue-600' : 'bg-gray-200'}`}
          >
            <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200 ${filters.verified ? 'translate-x-5' : 'translate-x-0.5'}`} />
          </button>
        </div>

        {/* Apply button */}
        <button className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-semibold text-sm transition-colors duration-200">
          Áp dụng bộ lọc
        </button>
      </div>
    </aside>
  );
}

function FilterSection({ title, children }) {
  return (
    <div>
      <h4 className="text-sm font-semibold text-gray-800 mb-3">{title}</h4>
      {children}
    </div>
  );
}

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CITIES } from '../../data/mockData';

const AI_SUGGESTIONS = [
  'Phòng trọ gần ĐH Bách Khoa, giá dưới 3 triệu',
  'Căn hộ mini 1PN ở Tây Hồ, có điều hòa',
  'Nhà cho thuê 3 phòng ngủ ở Đà Nẵng',
  'Phòng ở ghép nữ quận 1, wifi miễn phí',
  'Căn hộ chung cư view biển dưới 10 triệu',
];

export default function AISearchBar({ compact = false }) {
  const [query, setQuery] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [isAIMode, setIsAIMode] = useState(true);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const navigate = useNavigate();

  const handleSearch = (e) => {
    e.preventDefault();
    if (!query && !selectedCity) return;
    setIsSearching(true);
    setTimeout(() => {
      setIsSearching(false);
      navigate(`/search?q=${encodeURIComponent(query)}&city=${encodeURIComponent(selectedCity)}`);
    }, 800);
  };

  const handleSuggestionClick = (suggestion) => {
    setQuery(suggestion);
    setShowSuggestions(false);
  };

  if (compact) {
    return (
      <form onSubmit={handleSearch} className="flex gap-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Tìm phòng trọ..."
          className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        />
        <button
          type="submit"
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          Tìm
        </button>
      </form>
    );
  }

  return (
    <div className="w-full max-w-3xl mx-auto">
      {/* Mode toggle */}
      <div className="flex items-center gap-3 mb-4 justify-center">
        <button
          onClick={() => setIsAIMode(true)}
          className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
            isAIMode
              ? 'bg-blue-600 text-white shadow-md shadow-blue-200'
              : 'bg-white/80 text-gray-600 hover:bg-white'
          }`}
        >
          <span>🤖</span> Tìm kiếm AI
        </button>
        <button
          onClick={() => setIsAIMode(false)}
          className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
            !isAIMode
              ? 'bg-blue-600 text-white shadow-md shadow-blue-200'
              : 'bg-white/80 text-gray-600 hover:bg-white'
          }`}
        >
          <span>🔍</span> Tìm kiếm thường
        </button>
      </div>

      <form onSubmit={handleSearch} className="bg-white rounded-2xl shadow-xl shadow-blue-100/50 overflow-hidden border border-blue-100">
        {/* AI search */}
        {isAIMode ? (
          <div className="relative">
            <div className="flex items-start p-4 gap-3">
              <span className="text-2xl mt-0.5 flex-shrink-0">🤖</span>
              <div className="flex-1">
                <p className="text-xs text-blue-600 font-medium mb-1">AI TroHub đang lắng nghe...</p>
                <textarea
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onFocus={() => setShowSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                  placeholder="Mô tả phòng bạn cần: vị trí, ngân sách, tiện ích... VD: Tìm phòng trọ gần ĐH Bách Khoa, dưới 3 triệu, có điều hòa"
                  className="w-full text-sm text-gray-800 placeholder-gray-400 resize-none border-none outline-none bg-transparent leading-relaxed"
                  rows={2}
                />
              </div>
            </div>

            {/* AI Suggestions dropdown */}
            {showSuggestions && (
              <div className="absolute top-full left-0 right-0 bg-white border-t border-gray-100 shadow-lg z-10 rounded-b-2xl">
                <p className="px-4 pt-3 pb-1 text-xs text-gray-400 font-medium">💡 Gợi ý tìm kiếm</p>
                {AI_SUGGESTIONS.map((s, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => handleSuggestionClick(s)}
                    className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                  >
                    <span className="text-blue-400 mr-2">→</span>{s}
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Nhập địa chỉ, khu vực..."
              className="flex-1 px-5 py-4 text-sm text-gray-800 placeholder-gray-400 border-none outline-none bg-transparent"
            />
            <div className="h-px sm:h-auto sm:w-px bg-gray-200" />
            <select
              value={selectedCity}
              onChange={(e) => setSelectedCity(e.target.value)}
              className="px-4 py-4 text-sm text-gray-700 border-none outline-none bg-transparent cursor-pointer"
            >
              <option value="">Tất cả tỉnh/thành</option>
              {CITIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        )}

        {/* Bottom bar */}
        <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-t border-gray-100">
          <div className="flex gap-2 flex-wrap">
            {['Hà Nội', 'TP.HCM', 'Đà Nẵng'].map((city) => (
              <button
                key={city}
                type="button"
                onClick={() => setSelectedCity(city)}
                className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                  selectedCity === city
                    ? 'border-blue-500 text-blue-600 bg-blue-50'
                    : 'border-gray-200 text-gray-600 hover:border-blue-300'
                }`}
              >
                📍 {city}
              </button>
            ))}
          </div>
          <button
            type="submit"
            disabled={isSearching}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 shadow-sm hover:shadow-blue-200 hover:shadow-md disabled:opacity-70"
          >
            {isSearching ? (
              <>
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                <span>Đang phân tích...</span>
              </>
            ) : (
              <>
                <span>🔍</span>
                <span>Tìm ngay</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

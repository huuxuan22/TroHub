import React from 'react';
import { useNavigate } from 'react-router-dom';
import { CATEGORIES } from '../../data/mockData';

export default function CategorySection() {
  const navigate = useNavigate();

  return (
    <section className="py-16 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold text-gray-900 mb-3">Loại hình cho thuê</h2>
          <p className="text-gray-500 max-w-xl mx-auto">
            Khám phá đa dạng các loại hình cho thuê từ phòng trọ đến nhà nguyên căn, căn hộ cao cấp
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => navigate(`/search?type=${encodeURIComponent(cat.label)}`)}
              className="group flex flex-col items-center p-5 rounded-2xl border-2 border-transparent bg-gray-50 hover:bg-blue-50 hover:border-blue-200 transition-all duration-200 hover:-translate-y-1 hover:shadow-md"
            >
              <span className="text-4xl mb-3 group-hover:scale-110 transition-transform duration-200">
                {cat.icon}
              </span>
              <span className="text-sm font-semibold text-gray-800 group-hover:text-blue-700 text-center leading-tight mb-1">
                {cat.label}
              </span>
              <span className="text-xs text-gray-400 group-hover:text-blue-500">
                {cat.count.toLocaleString('vi')} tin
              </span>
            </button>
          ))}
        </div>

        {/* All cities quick nav */}
        <div className="mt-10 p-5 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl border border-blue-100">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm font-semibold text-gray-700 flex-shrink-0">📍 Khu vực nổi bật:</span>
            {['Hà Nội', 'TP. Hồ Chí Minh', 'Đà Nẵng', 'Hải Phòng', 'Cần Thơ', 'Nha Trang', 'Huế', 'Bình Dương'].map((city) => (
              <button
                key={city}
                onClick={() => navigate(`/search?city=${encodeURIComponent(city)}`)}
                className="text-sm text-blue-600 hover:text-blue-800 hover:underline font-medium"
              >
                {city}
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

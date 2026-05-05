import React, { useEffect, useState } from 'react';
import AISearchBar from './AISearchBar';

const HERO_STATS = [
  { value: '50K+', label: 'Phòng trọ' },
  { value: '200K+', label: 'Người dùng' },
  { value: '63', label: 'Tỉnh/TP' },
];

const ROTATING_WORDS = ['thông minh', 'nhanh chóng', 'tin cậy', 'dễ dàng'];

export default function HeroBanner() {
  const [currentWord, setCurrentWord] = useState(0);

  useEffect(() => {
    const n = ROTATING_WORDS.length;
    const timer = setInterval(() => {
      setCurrentWord((prev) => (prev + 1) % n);
    }, 2500);
    return () => clearInterval(timer);
  }, []);

  return (
    <section className="relative min-h-screen flex items-center overflow-hidden bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 pt-16">
      {/* Background decorations */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-400/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-indigo-400/20 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-white/5 rounded-full blur-3xl" />
        {/* Grid pattern */}
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
            backgroundSize: '50px 50px',
          }}
        />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left content */}
          <div className="text-white">
            {/* AI badge */}
            <div className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-sm border border-white/20 rounded-full px-4 py-2 text-sm mb-6">
              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              <span>🤖 AI đang hoạt động — phân tích 50,000+ tin đăng</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight mb-4">
              Tìm phòng trọ
              <br />
              <span className="relative inline-block">
                <span className="text-yellow-300 transition-all duration-500">
                  {ROTATING_WORDS[currentWord]}
                </span>
                <span className="absolute -bottom-1 left-0 right-0 h-1 bg-yellow-300/40 rounded-full" />
              </span>
            </h1>

            <p className="text-blue-100 text-lg leading-relaxed mb-8 max-w-lg">
              TroHub dùng AI để hiểu chính xác nhu cầu của bạn và đề xuất những căn phòng phù hợp nhất.
              Tiết kiệm thời gian, tìm ngay phòng ưng ý!
            </p>

            {/* Stats */}
            <div className="flex items-center gap-8 mb-10">
              {HERO_STATS.map((stat) => (
                <div key={stat.label} className="text-center">
                  <div className="text-2xl font-bold text-white">{stat.value}</div>
                  <div className="text-xs text-blue-200">{stat.label}</div>
                </div>
              ))}
            </div>

            {/* Search bar */}
            <AISearchBar />

            {/* Quick links */}
            <div className="flex flex-wrap gap-2 mt-6">
              <span className="text-blue-200 text-sm">Phổ biến:</span>
              {['Phòng trọ Hà Nội', 'Căn hộ TP.HCM', 'Phòng giá rẻ', 'Gần đại học'].map((tag) => (
                <button
                  key={tag}
                  className="text-sm text-white/80 hover:text-white bg-white/10 hover:bg-white/20 px-3 py-1 rounded-full transition-all"
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          {/* Right — decorative illustration */}
          <div className="hidden lg:flex flex-col items-center justify-center gap-4 relative">
            {/* Main card */}
            <div className="bg-white rounded-2xl shadow-2xl p-5 w-72 transform rotate-1 hover:rotate-0 transition-transform duration-500">
              <div className="aspect-video bg-gradient-to-br from-blue-100 to-indigo-100 rounded-xl mb-4 overflow-hidden flex items-center justify-center text-6xl">
                🏠
              </div>
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="font-semibold text-gray-900 text-sm">Phòng trọ cao cấp</p>
                  <p className="text-xs text-gray-500">Hai Bà Trưng, Hà Nội</p>
                </div>
                <span className="bg-green-100 text-green-700 text-xs font-medium px-2 py-0.5 rounded-full">Còn phòng</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-blue-600 font-bold">3.5 triệu/tháng</span>
                <div className="flex items-center gap-1 text-xs text-gray-500">
                  <span className="text-yellow-400">★</span> 4.8
                </div>
              </div>
              {/* AI score */}
              <div className="mt-3 p-2 bg-blue-50 rounded-lg">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-blue-600 font-medium">🤖 AI Score</span>
                  <span className="font-bold text-blue-700">92/100</span>
                </div>
                <div className="bg-blue-200 rounded-full h-1.5">
                  <div className="bg-blue-600 h-1.5 rounded-full" style={{ width: '92%' }} />
                </div>
              </div>
            </div>

            {/* Floating elements */}
            <div className="absolute -top-4 -right-4 bg-white rounded-xl shadow-lg px-4 py-3 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-xl">🤖</span>
                <div>
                  <p className="font-semibold text-gray-900 text-xs">AI đề xuất</p>
                  <p className="text-blue-600 text-xs font-medium">Phù hợp 96%</p>
                </div>
              </div>
            </div>

            <div className="absolute -bottom-4 -left-4 bg-white rounded-xl shadow-lg px-4 py-3 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-green-500 text-xl">✅</span>
                <div>
                  <p className="font-semibold text-gray-900 text-xs">Đã xác minh</p>
                  <p className="text-gray-500 text-xs">Chủ nhà uy tín</p>
                </div>
              </div>
            </div>

            {/* Notification toast */}
            <div className="absolute top-1/2 -right-8 bg-white rounded-xl shadow-lg px-3 py-2.5 w-52">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center text-base flex-shrink-0">
                  🔔
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-900">AI tìm thấy 5 phòng</p>
                  <p className="text-xs text-gray-500">Phù hợp với yêu cầu của bạn</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom wave */}
      <div className="absolute bottom-0 left-0 right-0">
        <svg viewBox="0 0 1440 60" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M0 60L1440 60L1440 20C1440 20 1080 60 720 40C360 20 0 60 0 60Z" fill="#f8fafc" />
        </svg>
      </div>
    </section>
  );
}

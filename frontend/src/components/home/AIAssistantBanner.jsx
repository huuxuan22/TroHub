import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const QUICK_PROMPTS = [
  '🏠 Phòng trọ giá rẻ cho sinh viên',
  '🏢 Căn hộ mini gần trung tâm',
  '👨‍👩‍👧 Nhà cho gia đình 4 người',
  '💼 Phòng cho người đi làm',
];

export default function AIAssistantBanner() {
  const [prompt, setPrompt] = useState('');
  const navigate = useNavigate();

  const handleSearch = (text) => {
    const q = text || prompt;
    if (q) navigate(`/search?q=${encodeURIComponent(q)}`);
  };

  return (
    <section className="py-16 bg-gradient-to-br from-blue-600 to-indigo-700 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-white/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-blue-400/20 rounded-full blur-3xl" />
      </div>

      <div className="relative max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <div className="inline-flex items-center gap-2 bg-white/15 rounded-full px-4 py-2 text-white text-sm mb-6">
          <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
          AI TroHub đang hoạt động
        </div>

        <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
          Mô tả phòng bạn muốn,<br />
          <span className="text-yellow-300">AI sẽ tìm cho bạn</span>
        </h2>

        <p className="text-blue-100 mb-8 max-w-xl mx-auto">
          Không cần tìm từng phòng thủ công. Chỉ cần nói với AI về nhu cầu của bạn, hệ thống sẽ đề xuất những căn phòng phù hợp nhất.
        </p>

        {/* Quick prompts */}
        <div className="flex flex-wrap justify-center gap-2 mb-6">
          {QUICK_PROMPTS.map((p) => (
            <button
              key={p}
              onClick={() => handleSearch(p)}
              className="bg-white/15 hover:bg-white/25 text-white text-sm px-4 py-2 rounded-full border border-white/20 transition-all duration-200 hover:border-white/40"
            >
              {p}
            </button>
          ))}
        </div>

        {/* Search input */}
        <div className="flex gap-3 max-w-xl mx-auto">
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="VD: Phòng trọ gần Đại học, có wifi, dưới 3 triệu..."
            className="flex-1 px-5 py-3.5 rounded-xl text-sm bg-white/20 text-white placeholder-blue-200 border border-white/30 focus:outline-none focus:ring-2 focus:ring-white/50 backdrop-blur-sm"
          />
          <button
            onClick={() => handleSearch()}
            className="bg-white text-blue-600 hover:bg-blue-50 px-6 py-3.5 rounded-xl font-semibold text-sm transition-colors duration-200 flex-shrink-0"
          >
            🔍 Tìm
          </button>
        </div>
      </div>
    </section>
  );
}

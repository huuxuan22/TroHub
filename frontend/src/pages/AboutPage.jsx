import React from 'react';
import { Link } from 'react-router-dom';

const coreValues = [
  {
    title: 'Minh bạch',
    desc: 'Thông tin phòng trọ rõ ràng, dễ kiểm chứng và hạn chế tin ảo.',
  },
  {
    title: 'Nhanh chóng',
    desc: 'Bộ lọc thông minh giúp người thuê tìm đúng phòng chỉ sau vài phút.',
  },
  {
    title: 'An toàn',
    desc: 'Khuyến nghị giao dịch và xác thực để giảm rủi ro cho cả hai bên.',
  },
];

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-slate-50 pt-20 pb-12 px-4">
      <div className="max-w-5xl mx-auto space-y-6">
        <section className="bg-white border border-gray-100 rounded-2xl p-6 sm:p-8 shadow-sm">
          <p className="text-sm font-semibold text-blue-600 mb-2">Về TroHub</p>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3">Nền tảng kết nối người thuê và chủ trọ</h1>
          <p className="text-gray-600 leading-relaxed">
            TroHub được xây dựng để giải quyết bài toán tìm phòng trọ mất thời gian và thiếu minh bạch.
            Chúng tôi tập trung vào trải nghiệm đơn giản, thông tin rõ ràng và hỗ trợ nhanh để bạn tìm được
            nơi ở phù hợp với ngân sách.
          </p>
        </section>

        <section className="grid md:grid-cols-3 gap-4">
          {coreValues.map((item) => (
            <article key={item.title} className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm">
              <h2 className="font-semibold text-gray-900 mb-2">{item.title}</h2>
              <p className="text-sm text-gray-600 leading-relaxed">{item.desc}</p>
            </article>
          ))}
        </section>

        <section className="bg-white border border-gray-100 rounded-2xl p-6 sm:p-8 shadow-sm">
          <h2 className="text-xl font-bold text-gray-900 mb-3">Sứ mệnh của chúng tôi</h2>
          <p className="text-gray-600 leading-relaxed mb-5">
            TroHub hướng tới một thị trường thuê trọ văn minh, nơi mọi người có thể ra quyết định dựa trên
            dữ liệu đáng tin cậy và nhận hỗ trợ đúng lúc.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              to="/search"
              className="inline-flex items-center rounded-xl bg-blue-600 text-white px-4 py-2.5 text-sm font-semibold hover:bg-blue-700 transition-colors"
            >
              Bắt đầu tìm phòng
            </Link>
            <Link
              to="/contact"
              className="inline-flex items-center rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Liên hệ đội ngũ TroHub
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}

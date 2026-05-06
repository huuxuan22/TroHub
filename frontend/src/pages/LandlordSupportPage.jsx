import React from 'react';
import { Link } from 'react-router-dom';

const supportChannels = [
  {
    title: 'Hotline ưu tiên',
    detail: '1900 6868 (8:00 - 22:00)',
  },
  {
    title: 'Email hỗ trợ',
    detail: 'landlord-support@trohub.vn',
  },
  {
    title: 'Tư vấn qua Zalo',
    detail: 'Phản hồi trong vòng 15 phút',
  },
];

const faqs = [
  'Làm sao để tin đăng được duyệt nhanh hơn?',
  'Khi nào nên dùng gói Nổi bật hoặc VIP?',
  'Cách chỉnh sửa thông tin khi đã có khách đặt lịch?',
];

export default function LandlordSupportPage() {
  return (
    <main className="min-h-screen bg-slate-50 pt-20 pb-12 px-4">
      <div className="max-w-5xl mx-auto space-y-6">
        <section className="bg-white border border-gray-100 rounded-2xl p-6 sm:p-8 shadow-sm">
          <p className="text-sm font-semibold text-blue-600 mb-2">Hỗ trợ chủ nhà</p>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3">Đội ngũ đồng hành cùng bạn 7 ngày/tuần</h1>
          <p className="text-gray-600 leading-relaxed">
            Từ tối ưu nội dung tin đăng đến xử lý khách tiềm năng, TroHub luôn có kênh hỗ trợ phù hợp để bạn cho
            thuê nhanh và hiệu quả hơn.
          </p>
        </section>

        <section className="grid md:grid-cols-3 gap-4">
          {supportChannels.map((item) => (
            <article key={item.title} className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm">
              <h2 className="font-semibold text-gray-900 mb-2">{item.title}</h2>
              <p className="text-sm text-gray-600">{item.detail}</p>
            </article>
          ))}
        </section>

        <section className="bg-white border border-gray-100 rounded-2xl p-6 sm:p-8 shadow-sm">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Câu hỏi thường gặp</h2>
          <ul className="space-y-3">
            {faqs.map((item) => (
              <li key={item} className="rounded-xl bg-slate-50 border border-gray-100 px-4 py-3 text-sm text-gray-700">
                {item}
              </li>
            ))}
          </ul>
          <div className="mt-5">
            <Link
              to="/contact"
              className="inline-flex items-center rounded-xl bg-blue-600 text-white px-4 py-2.5 text-sm font-semibold hover:bg-blue-700 transition-colors"
            >
              Gửi yêu cầu hỗ trợ
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}

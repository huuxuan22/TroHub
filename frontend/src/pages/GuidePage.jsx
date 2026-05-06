import React from 'react';
import { Link } from 'react-router-dom';

const steps = [
  {
    title: 'Bước 1: Xác định ngân sách và khu vực',
    desc: 'Chọn mức giá phù hợp thu nhập và ưu tiên khu vực gần nơi học/làm việc.',
  },
  {
    title: 'Bước 2: Lọc phòng theo tiện ích',
    desc: 'Sử dụng bộ lọc TroHub để chọn phòng có nội thất, giờ giấc, chỗ để xe phù hợp.',
  },
  {
    title: 'Bước 3: Liên hệ và đặt lịch xem',
    desc: 'Nhắn tin trực tiếp với chủ trọ, xác nhận thông tin trước khi đến xem.',
  },
  {
    title: 'Bước 4: Kiểm tra hợp đồng cẩn thận',
    desc: 'Đọc kỹ điều khoản cọc, điện nước, thời hạn báo trước và các khoản phát sinh.',
  },
];

const tips = [
  'Không chuyển cọc trước khi xem phòng thực tế.',
  'Nên chụp lại công tơ điện/nước khi nhận phòng.',
  'Giữ biên lai và nội dung trao đổi để đối chiếu khi cần.',
];

export default function GuidePage() {
  return (
    <main className="min-h-screen bg-slate-50 pt-20 pb-12 px-4">
      <div className="max-w-5xl mx-auto space-y-6">
        <section className="bg-white border border-gray-100 rounded-2xl p-6 sm:p-8 shadow-sm">
          <p className="text-sm font-semibold text-blue-600 mb-2">Hướng dẫn thuê phòng</p>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3">Quy trình thuê phòng an toàn trên TroHub</h1>
          <p className="text-gray-600 leading-relaxed">
            Dành cho người thuê lần đầu hoặc muốn tối ưu thời gian tìm phòng, hạn chế rủi ro khi giao dịch.
          </p>
        </section>

        <section className="space-y-3">
          {steps.map((step) => (
            <article key={step.title} className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm">
              <h2 className="font-semibold text-gray-900 mb-1.5">{step.title}</h2>
              <p className="text-sm text-gray-600 leading-relaxed">{step.desc}</p>
            </article>
          ))}
        </section>

        <section className="bg-amber-50 border border-amber-100 rounded-2xl p-6 sm:p-8">
          <h2 className="text-lg font-bold text-amber-900 mb-3">Lưu ý quan trọng</h2>
          <ul className="space-y-2">
            {tips.map((tip) => (
              <li key={tip} className="text-sm text-amber-900/90">
                • {tip}
              </li>
            ))}
          </ul>
          <div className="mt-5">
            <Link
              to="/search"
              className="inline-flex items-center rounded-xl bg-blue-600 text-white px-4 py-2.5 text-sm font-semibold hover:bg-blue-700 transition-colors"
            >
              Bắt đầu tìm phòng
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}

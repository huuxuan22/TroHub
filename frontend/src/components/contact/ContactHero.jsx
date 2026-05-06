import React from 'react';

export default function ContactHero() {
  return (
    <section className="pt-24 pb-10 bg-gradient-to-b from-slate-50 to-white">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <p className="inline-flex px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-sm font-medium">
          Liên hệ TroHub
        </p>
        <h1 className="mt-4 text-3xl md:text-4xl font-bold text-gray-900">
          Chúng tôi luôn sẵn sàng hỗ trợ bạn
        </h1>
        <p className="mt-4 text-gray-600 leading-relaxed">
          Gửi câu hỏi, góp ý hoặc nhu cầu hợp tác. Đội ngũ TroHub sẽ phản hồi trong vòng 24 giờ làm
          việc.
        </p>
      </div>
    </section>
  );
}

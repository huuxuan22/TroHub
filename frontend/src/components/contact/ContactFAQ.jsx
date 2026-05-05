import React from 'react';

const FAQ_ITEMS = [
  {
    question: 'Bao lâu thì tôi nhận được phản hồi?',
    answer: 'TroHub phản hồi qua email hoặc điện thoại trong vòng 24 giờ làm việc.',
  },
  {
    question: 'Tôi muốn hợp tác đăng tin số lượng lớn thì liên hệ ở đâu?',
    answer: 'Bạn vui lòng chọn nội dung "Hợp tác" trong form hoặc email trực tiếp tới partner@trohub.vn.',
  },
  {
    question: 'Tôi có thể báo cáo tin đăng không chính xác không?',
    answer: 'Có. Bạn có thể gửi link tin đăng và mô tả lỗi qua form liên hệ để đội ngũ kiểm tra.',
  },
];

export default function ContactFAQ() {
  return (
    <section className="pb-16">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-2xl font-bold text-gray-900">Câu hỏi thường gặp</h2>
        <div className="mt-5 space-y-3">
          {FAQ_ITEMS.map((item) => (
            <div key={item.question} className="bg-white border border-gray-100 rounded-xl p-5">
              <h3 className="font-semibold text-gray-900">{item.question}</h3>
              <p className="mt-2 text-sm text-gray-600">{item.answer}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

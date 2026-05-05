import React from 'react';

const CONTACT_ITEMS = [
  {
    title: 'Hotline',
    value: '1800 1234',
    description: 'Hỗ trợ từ 8:00 - 22:00 mỗi ngày',
    icon: '📞',
  },
  {
    title: 'Email hỗ trợ',
    value: 'support@trohub.vn',
    description: 'Phản hồi trong vòng 24 giờ',
    icon: '✉️',
  },
  {
    title: 'Văn phòng',
    value: '25 Nguyễn Huệ, Quận 1, TP.HCM',
    description: 'Làm việc từ thứ 2 đến thứ 6',
    icon: '📍',
  },
];

export default function ContactInfoCards() {
  return (
    <section className="pb-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-3 gap-5">
        {CONTACT_ITEMS.map((item) => (
          <div key={item.title} className="bg-white border border-gray-100 shadow-sm rounded-2xl p-5">
            <div className="text-2xl">{item.icon}</div>
            <h3 className="mt-3 text-lg font-semibold text-gray-900">{item.title}</h3>
            <p className="mt-1 text-blue-600 font-medium">{item.value}</p>
            <p className="mt-2 text-sm text-gray-500">{item.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

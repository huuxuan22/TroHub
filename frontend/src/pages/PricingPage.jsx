import React from 'react';

const plans = [
  {
    name: 'Gói Cơ Bản',
    price: '49.000đ',
    period: '/tin',
    features: ['Hiển thị 7 ngày', 'Tối đa 10 ảnh', 'Hỗ trợ duyệt tiêu chuẩn'],
    highlight: false,
  },
  {
    name: 'Gói Nổi Bật',
    price: '129.000đ',
    period: '/tin',
    features: ['Hiển thị 15 ngày', 'Ưu tiên vị trí trang tìm kiếm', 'Gắn nhãn Nổi bật'],
    highlight: true,
  },
  {
    name: 'Gói VIP',
    price: '299.000đ',
    period: '/tin',
    features: ['Hiển thị 30 ngày', 'Badge VIP + hỗ trợ tối ưu nội dung', 'Nhắc gia hạn tự động'],
    highlight: false,
  },
];

export default function PricingPage() {
  return (
    <main className="min-h-screen bg-slate-50 pt-20 pb-12 px-4">
      <div className="max-w-6xl mx-auto space-y-6">
        <section className="text-center">
          <p className="text-sm font-semibold text-blue-600 mb-2">Bảng giá dịch vụ</p>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3">Chọn gói phù hợp để tăng hiệu quả cho tin đăng</h1>
          <p className="text-sm text-gray-500 max-w-2xl mx-auto">
            Mọi gói đều hỗ trợ thống kê lượt xem và khách quan tâm, giúp chủ nhà tối ưu hiệu quả cho thuê.
          </p>
        </section>

        <section className="grid md:grid-cols-3 gap-4">
          {plans.map((plan) => (
            <article
              key={plan.name}
              className={`rounded-2xl border p-6 shadow-sm ${
                plan.highlight ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-gray-100'
              }`}
            >
              <h2 className={`font-semibold ${plan.highlight ? 'text-white' : 'text-gray-900'}`}>{plan.name}</h2>
              <div className="mt-3 mb-4">
                <span className={`text-3xl font-bold ${plan.highlight ? 'text-white' : 'text-gray-900'}`}>{plan.price}</span>
                <span className={`text-sm ml-1 ${plan.highlight ? 'text-blue-100' : 'text-gray-500'}`}>{plan.period}</span>
              </div>
              <ul className="space-y-2 mb-5">
                {plan.features.map((feature) => (
                  <li
                    key={feature}
                    className={`text-sm flex items-start gap-2 ${plan.highlight ? 'text-blue-50' : 'text-gray-600'}`}
                  >
                    <span className="mt-0.5">✓</span>
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              <button
                type="button"
                className={`w-full rounded-xl py-2.5 text-sm font-semibold transition-colors ${
                  plan.highlight
                    ? 'bg-white text-blue-700 hover:bg-blue-50'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                Chọn gói này
              </button>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}

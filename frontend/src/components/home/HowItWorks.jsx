import React from 'react';
import { HOW_IT_WORKS } from '../../data/mockData';

export default function HowItWorks() {
  return (
    <section className="py-16 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <span className="inline-block bg-blue-50 text-blue-600 text-sm font-semibold px-4 py-1.5 rounded-full mb-4">
            Đơn giản & Nhanh chóng
          </span>
          <h2 className="text-3xl font-bold text-gray-900 mb-3">TroHub hoạt động như thế nào?</h2>
          <p className="text-gray-500 max-w-xl mx-auto">
            4 bước đơn giản để tìm được căn phòng hoàn hảo với sự hỗ trợ của AI
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 relative">
          {/* Connecting line */}
          <div className="hidden lg:block absolute top-16 left-[12.5%] right-[12.5%] h-px border-t-2 border-dashed border-blue-200 z-0" />

          {HOW_IT_WORKS.map((step, i) => (
            <div key={step.step} className="relative z-10 text-center group">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-50 text-3xl mb-5 group-hover:bg-blue-600 group-hover:scale-110 transition-all duration-300 shadow-sm relative">
                {step.icon}
                <span className="absolute -top-2 -right-2 w-6 h-6 bg-blue-600 group-hover:bg-white text-white group-hover:text-blue-600 rounded-full text-xs font-bold flex items-center justify-center transition-all duration-300">
                  {step.step}
                </span>
              </div>
              <h3 className="font-bold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
                {step.title}
              </h3>
              <p className="text-sm text-gray-500 leading-relaxed">{step.desc}</p>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="text-center mt-12">
          <a
            href="/search"
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-8 py-3.5 rounded-xl font-semibold transition-all duration-200 shadow-md hover:shadow-blue-200 hover:shadow-xl"
          >
            <span>🤖</span>
            Bắt đầu tìm kiếm với AI
            <span>→</span>
          </a>
        </div>
      </div>
    </section>
  );
}

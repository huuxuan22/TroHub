import React from 'react';

export default function ContactForm() {
  return (
    <section className="pb-10">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6 md:p-8">
          <h2 className="text-2xl font-bold text-gray-900">Gửi yêu cầu hỗ trợ</h2>
          <p className="mt-2 text-sm text-gray-600">
            Điền thông tin bên dưới, chúng tôi sẽ liên hệ lại sớm nhất.
          </p>
          <form className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700">Họ và tên</label>
              <input
                type="text"
                placeholder="Nhập họ và tên"
                className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2.5 outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Số điện thoại</label>
              <input
                type="text"
                placeholder="Nhập số điện thoại"
                className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2.5 outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400"
              />
            </div>
            <div className="md:col-span-2">
              <label className="text-sm font-medium text-gray-700">Email</label>
              <input
                type="email"
                placeholder="example@email.com"
                className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2.5 outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400"
              />
            </div>
            <div className="md:col-span-2">
              <label className="text-sm font-medium text-gray-700">Nội dung</label>
              <textarea
                rows="5"
                placeholder="Mô tả vấn đề bạn đang gặp phải..."
                className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2.5 outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 resize-none"
              />
            </div>
            <div className="md:col-span-2">
              <button
                type="button"
                className="w-full md:w-auto bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg font-medium transition-colors"
              >
                Gửi liên hệ
              </button>
            </div>
          </form>
        </div>
      </div>
    </section>
  );
}

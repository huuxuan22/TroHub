import React from 'react';

const terms = [
  {
    title: '1. Phạm vi sử dụng',
    content:
      'TroHub cung cấp nền tảng đăng và tìm phòng trọ. Người dùng chịu trách nhiệm về tính chính xác của thông tin đã cung cấp.',
  },
  {
    title: '2. Tài khoản người dùng',
    content:
      'Bạn cần bảo mật thông tin đăng nhập. Mọi hoạt động phát sinh từ tài khoản sẽ được xem là do chính chủ tài khoản thực hiện.',
  },
  {
    title: '3. Nội dung tin đăng',
    content:
      'Không đăng tải thông tin sai sự thật, nội dung vi phạm pháp luật hoặc có tính chất lừa đảo. TroHub có quyền ẩn/xóa tin vi phạm.',
  },
  {
    title: '4. Giới hạn trách nhiệm',
    content:
      'TroHub đóng vai trò nền tảng kết nối và không là bên tham gia trực tiếp vào các giao dịch thuê nhà giữa người dùng.',
  },
  {
    title: '5. Cập nhật điều khoản',
    content:
      'Điều khoản có thể được cập nhật theo từng thời điểm. Việc tiếp tục sử dụng dịch vụ đồng nghĩa với việc bạn chấp nhận nội dung mới.',
  },
];

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-slate-50 pt-20 pb-12 px-4">
      <div className="max-w-4xl mx-auto">
        <section className="bg-white border border-gray-100 rounded-2xl p-6 sm:p-8 shadow-sm">
          <p className="text-sm font-semibold text-blue-600 mb-2">Điều khoản dịch vụ</p>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3">Quy định khi sử dụng TroHub</h1>
          <p className="text-gray-600 mb-6">
            Vui lòng đọc kỹ các điều khoản dưới đây để đảm bảo quá trình sử dụng nền tảng diễn ra an toàn và minh bạch.
          </p>

          <div className="space-y-4">
            {terms.map((item) => (
              <article key={item.title} className="rounded-xl border border-gray-100 bg-slate-50 p-4">
                <h2 className="font-semibold text-gray-900 mb-1.5">{item.title}</h2>
                <p className="text-sm text-gray-600 leading-relaxed">{item.content}</p>
              </article>
            ))}
          </div>

          <p className="text-xs text-gray-500 mt-6">Cập nhật lần cuối: 06/05/2026</p>
        </section>
      </div>
    </main>
  );
}

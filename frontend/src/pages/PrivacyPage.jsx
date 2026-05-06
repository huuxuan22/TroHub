import React from 'react';

const policies = [
  {
    title: 'Thông tin chúng tôi thu thập',
    content: 'Thông tin tài khoản, hành vi tìm kiếm, và dữ liệu kỹ thuật cần thiết để vận hành dịch vụ.',
  },
  {
    title: 'Mục đích sử dụng',
    content: 'Cá nhân hóa kết quả tìm phòng, hỗ trợ xử lý yêu cầu và nâng cao chất lượng trải nghiệm người dùng.',
  },
  {
    title: 'Bảo mật dữ liệu',
    content: 'Dữ liệu được lưu trữ với các biện pháp bảo vệ hợp lý để ngăn truy cập trái phép hoặc rò rỉ thông tin.',
  },
  {
    title: 'Chia sẻ với bên thứ ba',
    content: 'TroHub không bán dữ liệu cá nhân. Việc chia sẻ chỉ diễn ra khi cần cho vận hành hoặc theo yêu cầu pháp lý.',
  },
  {
    title: 'Quyền của người dùng',
    content: 'Bạn có thể yêu cầu chỉnh sửa hoặc xóa dữ liệu cá nhân bằng cách liên hệ bộ phận hỗ trợ của TroHub.',
  },
];

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-slate-50 pt-20 pb-12 px-4">
      <div className="max-w-4xl mx-auto">
        <section className="bg-white border border-gray-100 rounded-2xl p-6 sm:p-8 shadow-sm">
          <p className="text-sm font-semibold text-blue-600 mb-2">Chính sách bảo mật</p>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3">Cam kết bảo vệ thông tin người dùng</h1>
          <p className="text-gray-600 mb-6">
            TroHub tôn trọng quyền riêng tư và minh bạch về cách chúng tôi thu thập, sử dụng, lưu trữ dữ liệu.
          </p>

          <div className="space-y-3">
            {policies.map((item) => (
              <article key={item.title} className="rounded-xl border border-gray-100 p-4">
                <h2 className="font-semibold text-gray-900 mb-1.5">{item.title}</h2>
                <p className="text-sm text-gray-600 leading-relaxed">{item.content}</p>
              </article>
            ))}
          </div>

          <p className="text-xs text-gray-500 mt-6">Nếu cần hỗ trợ về dữ liệu cá nhân, vui lòng liên hệ support@trohub.vn.</p>
        </section>
      </div>
    </main>
  );
}

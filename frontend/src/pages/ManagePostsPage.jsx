import React from 'react';
import { Link } from 'react-router-dom';

const posts = [
  { id: 1, title: 'Phòng 20m2 gần ĐH Hutech', status: 'Đang hiển thị', views: 1240, leads: 18 },
  { id: 2, title: 'Studio full nội thất quận 7', status: 'Chờ duyệt', views: 0, leads: 0 },
  { id: 3, title: 'Phòng trọ giá rẻ Bình Thạnh', status: 'Hết hạn', views: 980, leads: 9 },
];

const statusCls = {
  'Đang hiển thị': 'bg-emerald-50 text-emerald-700',
  'Chờ duyệt': 'bg-amber-50 text-amber-700',
  'Hết hạn': 'bg-gray-100 text-gray-600',
};

export default function ManagePostsPage() {
  return (
    <main className="min-h-screen bg-slate-50 pt-20 pb-12 px-4">
      <div className="max-w-6xl mx-auto space-y-6">
        <section className="bg-white border border-gray-100 rounded-2xl p-6 sm:p-8 shadow-sm">
          <p className="text-sm font-semibold text-blue-600 mb-2">Dành cho chủ nhà</p>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Quản lý tin đăng</h1>
          <p className="text-sm text-gray-500 mb-5">
            Theo dõi trạng thái tin, lượt xem và lượng khách quan tâm tại một nơi.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              to="/post"
              className="inline-flex items-center rounded-xl bg-blue-600 text-white px-4 py-2.5 text-sm font-semibold hover:bg-blue-700 transition-colors"
            >
              + Đăng tin mới
            </Link>
            <button
              type="button"
              className="inline-flex items-center rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Xuất báo cáo
            </button>
          </div>
        </section>

        <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card label="Tổng tin đăng" value="12" sub="3 tin đang hoạt động" />
          <Card label="Tổng lượt xem" value="8.420" sub="+14% so với tháng trước" />
          <Card label="Khách liên hệ" value="96" sub="Tỷ lệ phản hồi: 92%" />
        </section>

        <section className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">Danh sách tin gần đây</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-gray-600">
                <tr>
                  <th className="text-left px-6 py-3 font-medium">Tiêu đề</th>
                  <th className="text-left px-6 py-3 font-medium">Trạng thái</th>
                  <th className="text-left px-6 py-3 font-medium">Lượt xem</th>
                  <th className="text-left px-6 py-3 font-medium">Liên hệ</th>
                  <th className="text-left px-6 py-3 font-medium">Hành động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {posts.map((post) => (
                  <tr key={post.id} className="hover:bg-slate-50/70">
                    <td className="px-6 py-4 text-gray-800">{post.title}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${statusCls[post.status]}`}>
                        {post.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-700">{post.views.toLocaleString('vi-VN')}</td>
                    <td className="px-6 py-4 text-gray-700">{post.leads}</td>
                    <td className="px-6 py-4">
                      <button type="button" className="text-blue-600 hover:underline font-medium">
                        Chỉnh sửa
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}

function Card({ label, value, sub }) {
  return (
    <article className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm">
      <p className="text-sm text-gray-500 mb-1">{label}</p>
      <p className="text-2xl font-bold text-gray-900 mb-1">{value}</p>
      <p className="text-xs text-gray-500">{sub}</p>
    </article>
  );
}

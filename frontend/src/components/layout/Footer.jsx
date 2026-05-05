import React from 'react';
import { Link } from 'react-router-dom';

const FOOTER_LINKS = {
  'Về TroHub': [
    { label: 'Giới thiệu', path: '/about' },
    { label: 'Điều khoản dịch vụ', path: '/terms' },
    { label: 'Chính sách bảo mật', path: '/privacy' },
    { label: 'Liên hệ', path: '/contact' },
  ],
  'Dành cho người thuê': [
    { label: 'Tìm phòng trọ', path: '/search' },
    { label: 'Tìm căn hộ', path: '/search?type=apartment' },
    { label: 'Tìm nhà nguyên căn', path: '/search?type=house' },
    { label: 'Hướng dẫn thuê phòng', path: '/guide' },
  ],
  'Dành cho chủ nhà': [
    { label: 'Đăng tin cho thuê', path: '/post' },
    { label: 'Quản lý tin đăng', path: '/manage' },
    { label: 'Bảng giá dịch vụ', path: '/pricing' },
    { label: 'Hỗ trợ chủ nhà', path: '/landlord-support' },
  ],
};

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8">
          {/* Brand */}
          <div className="lg:col-span-2">
            <Link to="/" className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
                <span className="text-white font-bold text-sm">T</span>
              </div>
              <span className="text-xl font-bold text-white">
                Tro<span className="text-blue-400">Hub</span>
              </span>
            </Link>
            <p className="text-sm leading-relaxed mb-4 text-gray-400">
              Nền tảng tìm kiếm phòng trọ thông minh, ứng dụng AI để mang đến trải nghiệm tìm phòng nhanh chóng, chính xác và tiện lợi nhất.
            </p>
            <div className="flex gap-3">
              {['📱', '📷', '🎬', '💬'].map((icon, i) => (
                <button
                  key={i}
                  className="w-9 h-9 rounded-lg bg-gray-800 hover:bg-blue-600 flex items-center justify-center transition-colors text-base"
                >
                  {icon}
                </button>
              ))}
            </div>
            <div className="mt-4 p-3 bg-gray-800 rounded-xl">
              <p className="text-xs text-gray-400 mb-2">Tải ứng dụng TroHub</p>
              <div className="flex gap-2">
                <button className="flex-1 bg-black text-white text-xs py-2 px-3 rounded-lg border border-gray-600 hover:border-blue-500 transition-colors">
                  🍏 App Store
                </button>
                <button className="flex-1 bg-black text-white text-xs py-2 px-3 rounded-lg border border-gray-600 hover:border-blue-500 transition-colors">
                  🤖 Google Play
                </button>
              </div>
            </div>
          </div>

          {/* Links */}
          {Object.entries(FOOTER_LINKS).map(([title, links]) => (
            <div key={title}>
              <h3 className="text-white font-semibold text-sm mb-4">{title}</h3>
              <ul className="space-y-2">
                {links.map((link) => (
                  <li key={link.path}>
                    <Link
                      to={link.path}
                      className="text-sm text-gray-400 hover:text-blue-400 transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="mt-10 pt-6 border-t border-gray-800 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-gray-500">
            © 2026 TroHub. Bản quyền thuộc về TroHub JSC.
          </p>
          <div className="flex items-center gap-4 text-xs text-gray-500">
            <span>🛡️ Thanh toán bảo mật</span>
            <span>•</span>
            <span>📞 Hotline: 1800 1234</span>
            <span>•</span>
            <span>✉️ support@trohub.vn</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

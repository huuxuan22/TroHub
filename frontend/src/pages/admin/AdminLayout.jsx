import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const NAV_ITEMS = [
  { to: '/admin', end: true, label: 'Tổng quan', icon: '📊' },
  { to: '/admin/landlords', label: 'Duyệt chủ nhà', icon: '🪪' },
  { to: '/admin/users', label: 'Người dùng', icon: '👥' },
  { to: '/admin/rooms', label: 'Phòng / Tin đăng', icon: '🏠' },
  { to: '/admin/reports', label: 'Báo cáo', icon: '🚩' },
];

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/', { replace: true });
  };

  return (
    <div className="min-h-screen bg-slate-100 pt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Topbar (mobile) */}
        <div className="lg:hidden flex items-center justify-between mb-4 bg-white border border-slate-200 rounded-2xl px-4 py-3 shadow-sm">
          <div>
            <p className="text-xs uppercase tracking-wide text-blue-600 font-semibold">Admin</p>
            <p className="text-sm font-bold text-slate-800">TroHub Console</p>
          </div>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-600"
          >
            {open ? 'Đóng menu' : 'Mở menu'}
          </button>
        </div>

        <div className="grid lg:grid-cols-[260px_1fr] gap-6">
          {/* Sidebar */}
          <aside
            className={`bg-white border border-slate-200 rounded-2xl shadow-sm p-4 h-fit lg:sticky lg:top-20 ${
              open ? 'block' : 'hidden lg:block'
            }`}
          >
            <div className="hidden lg:block mb-4 px-2">
              <p className="text-xs uppercase tracking-wide text-blue-600 font-semibold">Admin</p>
              <p className="text-lg font-bold text-slate-800">TroHub Console</p>
              <p className="text-xs text-slate-500 mt-1">
                Xin chào, <span className="font-semibold text-slate-700">{user?.full_name}</span>
              </p>
            </div>

            <nav className="space-y-1">
              {NAV_ITEMS.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  onClick={() => setOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-blue-50 text-blue-700'
                        : 'text-slate-600 hover:text-blue-700 hover:bg-blue-50'
                    }`
                  }
                >
                  <span className="text-base">{item.icon}</span>
                  <span>{item.label}</span>
                </NavLink>
              ))}
            </nav>

            <div className="border-t border-slate-100 mt-4 pt-4 space-y-2">
              <button
                type="button"
                onClick={() => navigate('/')}
                className="w-full flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
              >
                ← Về trang khách
              </button>
              <button
                type="button"
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 rounded-xl border border-red-200 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
              >
                Đăng xuất
              </button>
            </div>
          </aside>

          {/* Content */}
          <main className="min-w-0">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}

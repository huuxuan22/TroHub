import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

export default function RequireAdmin({ children }) {
  const { user, authLoading } = useAuth();
  const location = useLocation();

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center pt-20 bg-slate-50 text-gray-500 text-sm">
        Đang tải...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (String(user.role).toLowerCase() !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center pt-20 bg-slate-50 px-4">
        <div className="max-w-md text-center bg-white border border-gray-100 shadow-sm rounded-2xl p-8">
          <div className="text-5xl mb-4">⛔</div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Không có quyền truy cập</h1>
          <p className="text-sm text-gray-500 mb-5">
            Chỉ tài khoản quản trị viên (admin) mới có thể vào khu vực này.
          </p>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-xl bg-blue-600 text-white px-5 py-2.5 text-sm font-semibold hover:bg-blue-700 transition-colors"
          >
            ← Về trang chủ
          </a>
        </div>
      </div>
    );
  }

  return children;
}

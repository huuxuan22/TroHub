import React from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { FavoritesProvider } from './contexts/FavoritesContext';
import Navbar from './components/layout/Navbar';
import Footer from './components/layout/Footer';
import ChatWidget from './components/common/ChatWidget';
import HomePage from './pages/HomePage';
import SearchPage from './pages/SearchPage';
import RoomDetailPage from './pages/RoomDetailPage';
import PostRoomPage from './pages/PostRoomPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ManageRoomsPage from './pages/ManageRoomsPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import AboutPage from './pages/AboutPage';
import TermsPage from './pages/TermsPage';
import PrivacyPage from './pages/PrivacyPage';
import ManagePostsPage from './pages/ManagePostsPage';
import PricingPage from './pages/PricingPage';
import LandlordSupportPage from './pages/LandlordSupportPage';
import GuidePage from './pages/GuidePage';
import ContactPage from './pages/ContactPage';
import BecomeLandlordPage from './pages/BecomeLandlordPage';
import LandlordPendingPage from './pages/LandlordPendingPage';
import NewsPage from './pages/NewsPage';
import FavoritesPage from './pages/FavoritesPage';
import RequireAuth from './components/auth/RequireAuth';
import VerifiedListingGate from './components/auth/VerifiedListingGate';
import RequireAdmin from './components/auth/RequireAdmin';
import AdminLayout from './pages/admin/AdminLayout';
import AdminOverviewPage from './pages/admin/AdminOverviewPage';
import AdminLandlordsPage from './pages/admin/AdminLandlordsPage';
import AdminUsersPage from './pages/admin/AdminUsersPage';
import AdminRoomsPage from './pages/admin/AdminRoomsPage';
import AdminReportsPage from './pages/admin/AdminReportsPage';
import FeaturedHotRoomsGate from './components/rooms/FeaturedHotRoomsGate';
import './index.css';

function NotFoundPage() {
  return (
    <div className="min-h-screen flex items-center justify-center pt-16 bg-slate-50">
      <div className="text-center">
        <div className="text-8xl mb-6">🏠</div>
        <h1 className="text-4xl font-bold text-gray-900 mb-3">404</h1>
        <p className="text-gray-500 mb-6">Trang bạn tìm không tồn tại</p>
        <a href="/" className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-xl font-medium hover:bg-blue-700 transition-colors">
          ← Về trang chủ
        </a>
      </div>
    </div>
  );
}

function AppShell() {
  // Khu vực admin chỉ giữ Navbar, ẩn Footer + ChatWidget cho gọn dashboard.
  const location = useLocation();
  const isAdminArea = location.pathname.startsWith('/admin');

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <div className="flex-1">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/favorites" element={<FavoritesPage />} />
          <Route path="/room/:id" element={<RoomDetailPage />} />
          <Route
            path="/post"
            element={(
              <VerifiedListingGate>
                <PostRoomPage />
              </VerifiedListingGate>
            )}
          />
          <Route
            path="/manage-rooms"
            element={(
              <VerifiedListingGate>
                <ManageRoomsPage />
              </VerifiedListingGate>
            )}
          />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/terms" element={<TermsPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route
            path="/manage"
            element={(
              <VerifiedListingGate>
                <ManagePostsPage />
              </VerifiedListingGate>
            )}
          />
          <Route
            path="/become-landlord"
            element={(
              <RequireAuth>
                <BecomeLandlordPage />
              </RequireAuth>
            )}
          />
          <Route
            path="/landlord-pending"
            element={(
              <RequireAuth>
                <LandlordPendingPage />
              </RequireAuth>
            )}
          />
          <Route path="/pricing" element={<PricingPage />} />
          <Route path="/landlord-support" element={<LandlordSupportPage />} />
          <Route path="/guide" element={<GuidePage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/news" element={<NewsPage />} />

          {/* Admin area */}
          <Route
            path="/admin"
            element={(
              <RequireAdmin>
                <AdminLayout />
              </RequireAdmin>
            )}
          >
            <Route index element={<AdminOverviewPage />} />
            <Route path="landlords" element={<AdminLandlordsPage />} />
            <Route path="users" element={<AdminUsersPage />} />
            <Route path="rooms" element={<AdminRoomsPage />} />
            <Route path="reports" element={<AdminReportsPage />} />
          </Route>

          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </div>
      {!isAdminArea && <Footer />}
      {!isAdminArea && <ChatWidget />}
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <FavoritesProvider>
          <FeaturedHotRoomsGate />
          <AppShell />
        </FavoritesProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

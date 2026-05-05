import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Navbar from './components/layout/Navbar';
import Footer from './components/layout/Footer';
import ChatWidget from './components/common/ChatWidget';
import HomePage from './pages/HomePage';
import SearchPage from './pages/SearchPage';
import RoomDetailPage from './pages/RoomDetailPage';
import PostRoomPage from './pages/PostRoomPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ContactPage from './pages/ContactPage';
import NewsPage from './pages/NewsPage';
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

export default function App() {
  return (
    <BrowserRouter>
      <div className="flex flex-col min-h-screen">
        <Navbar />
        <div className="flex-1">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/search" element={<SearchPage />} />
            <Route path="/room/:id" element={<RoomDetailPage />} />
            <Route path="/post" element={<PostRoomPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/contact" element={<ContactPage />} />
            <Route path="/news" element={<NewsPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </div>
        <Footer />
        <ChatWidget />
      </div>
    </BrowserRouter>
  );
}

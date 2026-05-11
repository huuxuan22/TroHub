import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const NAV_LINKS = [
  { label: 'Trang chủ', path: '/' },
  { label: 'Tìm phòng', path: '/search' },
  { label: 'Đăng tin', path: '/post' },
  { label: 'Quản lý phòng', path: '/manage-rooms' },
  { label: 'Tin tức', path: '/news' },
  { label: 'Liên hệ', path: '/contact' },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    setMenuOpen(false);
  }, [location]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header
      className={`
        fixed top-0 left-0 right-0 z-50 transition-all duration-300
        ${scrolled ? 'bg-white shadow-md' : 'bg-white/95 backdrop-blur-sm'}
      `}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2 flex-shrink-0">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center shadow-sm">
              <span className="text-white font-bold text-sm">T</span>
            </div>
            <span className="text-xl font-bold text-gray-900">
              Tro<span className="text-blue-600">Hub</span>
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={`
                  px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200
                  ${location.pathname === link.path
                    ? 'text-blue-600 bg-blue-50'
                    : 'text-gray-600 hover:text-blue-600 hover:bg-blue-50'}
                `}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate('/post')}
              className="hidden md:inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200"
            >
              <span>+</span>
              Đăng tin
            </button>

            {user ? (
              <div className="hidden md:flex items-center gap-2">
                <span className="text-sm text-gray-700">👤 {user.full_name}</span>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="text-sm text-gray-600 hover:text-red-600 transition-colors border border-gray-200 hover:border-red-300 rounded-lg px-3 py-2"
                >
                  Đăng xuất
                </button>
              </div>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => navigate('/login')}
                  className="hidden md:flex items-center gap-2 text-sm text-gray-600 hover:text-blue-600 transition-colors border border-gray-200 hover:border-blue-300 rounded-lg px-3 py-2"
                >
                  <span>👤</span>
                  <span className="hidden lg:inline">Đăng nhập</span>
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/register')}
                  className="hidden md:inline-flex items-center text-sm font-semibold rounded-lg px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                >
                  Đăng ký
                </button>
              </>
            )}

            <button
              type="button"
              onClick={() => setMenuOpen(!menuOpen)}
              className="md:hidden p-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
              aria-label="Menu"
            >
              <div className="w-5 h-5 flex flex-col justify-center gap-1">
                <span className={`block h-0.5 bg-current transition-all duration-300 ${menuOpen ? 'rotate-45 translate-y-1.5' : ''}`} />
                <span className={`block h-0.5 bg-current transition-all duration-300 ${menuOpen ? 'opacity-0' : ''}`} />
                <span className={`block h-0.5 bg-current transition-all duration-300 ${menuOpen ? '-rotate-45 -translate-y-1.5' : ''}`} />
              </div>
            </button>
          </div>
        </div>
      </div>

      <div className={`md:hidden transition-all duration-300 overflow-hidden ${menuOpen ? 'max-h-96' : 'max-h-0'}`}>
        <div className="bg-white border-t border-gray-100 px-4 py-3 space-y-1">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              className={`
                block px-4 py-2.5 rounded-lg text-sm font-medium transition-colors
                ${location.pathname === link.path
                  ? 'text-blue-600 bg-blue-50'
                  : 'text-gray-700 hover:text-blue-600 hover:bg-blue-50'}
              `}
            >
              {link.label}
            </Link>
          ))}
          <div className="pt-2 border-t border-gray-100 flex flex-col gap-2">
            {user ? (
              <button
                type="button"
                onClick={handleLogout}
                className="w-full text-center text-sm text-gray-600 border border-gray-200 py-2.5 rounded-lg"
              >
                Đăng xuất
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => navigate('/login')}
                  className="w-full text-center text-sm text-gray-600 border border-gray-200 py-2.5 rounded-lg"
                >
                  Đăng nhập
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/register')}
                  className="w-full text-center text-sm font-semibold bg-blue-600 text-white py-2.5 rounded-lg"
                >
                  Đăng ký
                </button>
              </>
            )}
            <button
              type="button"
              onClick={() => navigate('/post')}
              className="w-full text-center text-sm font-semibold text-white bg-blue-600 py-2.5 rounded-lg"
            >
              Đăng tin
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}

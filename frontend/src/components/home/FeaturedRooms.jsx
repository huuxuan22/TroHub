import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import RoomCard from '../rooms/RoomCard';
import { fetchRooms } from '../../services/roomApi';

const TABS = ['Tất cả', 'Phòng trọ', 'Căn hộ mini', 'Nhà nguyên căn', 'Chung cư'];

export default function FeaturedRooms() {
  const [activeTab, setActiveTab] = useState('Tất cả');
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const loadFeaturedRooms = async () => {
      try {
        setLoading(true);
        const data = await fetchRooms({ status: 'available', sort_by: 'created_at', sort_order: 'desc', limit: 12 });
        setRooms(data);
      } catch {
        setRooms([]);
      } finally {
        setLoading(false);
      }
    };

    loadFeaturedRooms();
  }, []);

  const filtered = activeTab === 'Tất cả'
    ? rooms
    : rooms.filter((r) => r.type.includes(activeTab.split(' ')[0]));

  return (
    <section className="py-16 bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
          <div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Phòng trọ nổi bật</h2>
            <p className="text-gray-500">Được AI chọn lọc dựa trên chất lượng và độ phổ biến</p>
          </div>
          <button
            onClick={() => navigate('/search')}
            className="flex-shrink-0 text-blue-600 hover:text-blue-700 font-medium text-sm flex items-center gap-1"
          >
            Xem tất cả <span>→</span>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-8 overflow-x-auto pb-2 scrollbar-hide">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                activeTab === tab
                  ? 'bg-blue-600 text-white shadow-sm shadow-blue-200'
                  : 'bg-white text-gray-600 hover:text-blue-600 border border-gray-200 hover:border-blue-300'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {loading && [...Array(3)].map((_, idx) => (
            <div key={idx} className="h-72 bg-white rounded-2xl border border-gray-100 animate-pulse" />
          ))}
          {filtered.map((room) => (
            <RoomCard key={room.id} room={room} featured={room.isFeatured} />
          ))}
        </div>

        {/* Load more */}
        <div className="text-center mt-10">
          <button
            onClick={() => navigate('/search')}
            className="inline-flex items-center gap-2 border-2 border-blue-200 text-blue-600 hover:bg-blue-600 hover:text-white hover:border-blue-600 px-8 py-3 rounded-xl font-semibold transition-all duration-200"
          >
            Xem thêm phòng trọ
            <span>→</span>
          </button>
        </div>
      </div>
    </section>
  );
}

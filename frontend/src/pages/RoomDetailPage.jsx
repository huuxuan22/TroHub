import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { AMENITIES } from '../data/mockData';
import StarRating from '../components/common/StarRating';
import Badge from '../components/common/Badge';
import RoomCard from '../components/rooms/RoomCard';
import HomeMapLeaflet from '../components/home/HomeMapLeaflet';
import FavoriteToggle from '../components/favorites/FavoriteToggle';
import { useAuth } from '../contexts/AuthContext';
import { isAdminUser } from '../utils/userRoles';
import { fetchRoomDetail, fetchRooms, hasExactCoordinates } from '../services/roomApi';
import useGeolocation, { formatDistanceKm, haversineDistanceKm } from '../utils/useGeolocation';

function formatPrice(price) {
  return price >= 1000000 ? `${(price / 1000000).toFixed(1).replace('.0', '')} triệu` : `${price / 1000}k`;
}

export default function RoomDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const hideFavorites = isAdminUser(user);
  const navigate = useNavigate();
  const [room, setRoom] = useState(null);
  const [activeImg, setActiveImg] = useState(0);
  const [showContact, setShowContact] = useState(false);
  const [tab, setTab] = useState('detail');
  const [relatedRooms, setRelatedRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [myLocation, setMyLocation] = useState(null);
  const [myLocationError, setMyLocationError] = useState('');
  const { requestLocation, loading: locating } = useGeolocation();

  useEffect(() => {
    const loadRoomDetail = async () => {
      try {
        setLoading(true);
        const { room: detail } = await fetchRoomDetail(id);
        setRoom(detail);
        const { rooms: list } = await fetchRooms({ keyword: detail.city || detail.address, limit: 6 });
        setRelatedRooms(list.filter((r) => r.id !== detail.id).slice(0, 3));
      } catch {
        setRoom(null);
        setRelatedRooms([]);
      } finally {
        setLoading(false);
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    loadRoomDetail();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center pt-16">
        <div className="text-gray-500">Đang tải dữ liệu phòng...</div>
      </div>
    );
  }

  if (!room) {
    return (
      <div className="min-h-screen flex items-center justify-center pt-16">
        <div className="text-center">
          <div className="text-6xl mb-4">🔍</div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Không tìm thấy phòng</h2>
          <button onClick={() => navigate('/search')} className="text-blue-600 hover:underline">
            Quay lại tìm kiếm
          </button>
        </div>
      </div>
    );
  }

  const amenityDetails = (room.amenities || [])
    .map((id) => AMENITIES.find((a) => a.id === id))
    .filter(Boolean);

  const distanceKm =
    myLocation && room.latitude != null && room.longitude != null
      ? haversineDistanceKm(myLocation.latitude, myLocation.longitude, room.latitude, room.longitude)
      : null;

  const handleGetMyLocation = async () => {
    setMyLocationError('');
    try {
      const pos = await requestLocation();
      setMyLocation(pos);
    } catch (err) {
      setMyLocationError(err.message || 'Không lấy được vị trí.');
    }
  };

  const openDirections = () => {
    if (!hasExactCoordinates(room)) return;
    const dest = `${room.latitude},${room.longitude}`;
    const origin = myLocation ? `&origin=${myLocation.latitude},${myLocation.longitude}` : '';
    window.open(
      `https://www.google.com/maps/dir/?api=1&destination=${dest}${origin}&travelmode=driving`,
      '_blank',
      'noopener,noreferrer',
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 pt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-gray-500 mb-6">
          <Link to="/" className="hover:text-blue-600">Trang chủ</Link>
          <span>/</span>
          <Link to="/search" className="hover:text-blue-600">Tìm kiếm</Link>
          <span>/</span>
          <span className="text-gray-900 truncate max-w-xs">{room.title}</span>
        </nav>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Gallery */}
            <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100">
              <div className="aspect-video bg-gray-100 overflow-hidden relative group">
                <img
                  src={room.images?.[activeImg] || room.images?.[0]}
                  alt={room.title}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  onError={(e) => { e.target.style.display = 'none'; }}
                />
                {/* Badges overlay */}
                <div className="absolute top-4 left-4 flex gap-2">
                  {room.isVerified && <span className="bg-blue-600 text-white text-xs font-semibold px-3 py-1 rounded-full">✓ Đã xác minh</span>}
                  {room.isFeatured && <span className="bg-yellow-400 text-yellow-900 text-xs font-semibold px-3 py-1 rounded-full">⭐ Nổi bật</span>}
                </div>
                {!hideFavorites && <FavoriteToggle roomId={room.id} variant="detail" />}
              </div>
              {/* Thumbnails */}
              {room.images?.length > 1 && (
                <div className="flex gap-2 p-4">
                  {room.images.map((img, i) => (
                    <button
                      key={i}
                      onClick={() => setActiveImg(i)}
                      className={`w-20 h-14 rounded-lg overflow-hidden border-2 transition-all ${activeImg === i ? 'border-blue-500' : 'border-transparent hover:border-blue-200'}`}
                    >
                      <img src={img} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Title & basic info */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div className="flex-1">
                  <div className="flex flex-wrap gap-2 mb-3">
                    <Badge variant="blue">{room.type}</Badge>
                    {room.isNew && <Badge variant="green">Mới đăng</Badge>}
                  </div>
                  <h1 className="text-2xl font-bold text-gray-900 mb-2">{room.title}</h1>
                  <p className="text-gray-600 flex items-center gap-1.5">
                    <span>🧭</span>
                    {room.address}, {room.city}
                  </p>
                </div>
                <div className="flex-shrink-0 text-right">
                  <p className="text-3xl font-bold text-blue-600">{formatPrice(room.price)}</p>
                  <p className="text-gray-400 text-sm">/tháng</p>
                </div>
              </div>

              {/* Key stats */}
              <div className="grid grid-cols-3 gap-4 py-4 border-y border-gray-100 my-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-gray-900">{room.area}</p>
                  <p className="text-xs text-gray-500">m² diện tích</p>
                </div>
                <div className="text-center border-x border-gray-100">
                  <div className="flex items-center justify-center gap-1 mb-0.5">
                    <StarRating rating={room.rating} />
                  </div>
                  <p className="text-xs text-gray-500">{room.rating}/5 ({room.reviewCount} đánh giá)</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-blue-600">{room.aiScore}</p>
                  <p className="text-xs text-gray-500">🧠 AI Score</p>
                </div>
              </div>

              {/* AI highlight */}
              {room.aiHighlight && (
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-xl p-4">
                  <p className="text-sm font-semibold text-blue-800 flex items-center gap-2">
                    <span className="text-base">🧠</span>
                    Nhận xét từ AI TroHub
                  </p>
                  <p className="text-sm text-blue-700 mt-1">{room.aiHighlight}</p>
                  <div className="mt-2 bg-blue-200/50 rounded-full h-2">
                    <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${room.aiScore}%` }} />
                  </div>
                  <p className="text-xs text-blue-600 mt-1 font-medium">Điểm phù hợp: {room.aiScore}/100</p>
                </div>
              )}
            </div>

            {/* Tabs */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="flex border-b border-gray-100">
                {['detail', 'amenities', 'map'].map((t) => (
                  <button
                    key={t}
                    onClick={() => setTab(t)}
                    className={`flex-1 py-3.5 text-sm font-medium transition-colors ${tab === t ? 'text-blue-600 border-b-2 border-blue-600 -mb-px' : 'text-gray-500 hover:text-gray-700'}`}
                  >
                    {{ detail: '📄 Chi tiết', amenities: '🧰 Tiện ích', map: '🧭 Bản đồ' }[t]}
                  </button>
                ))}
              </div>
              <div className="p-6">
                {tab === 'detail' && (
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-3">Mô tả</h3>
                    <p className="text-gray-600 leading-relaxed text-sm">{room.description}</p>
                    <div className="mt-4 grid grid-cols-2 gap-3">
                      <InfoItem label="Loại hình" value={room.type} />
                      <InfoItem label="Diện tích" value={`${room.area} m²`} />
                      <InfoItem label="Thành phố" value={room.city} />
                      <InfoItem label="Trạng thái" value="Còn phòng" />
                    </div>
                  </div>
                )}
                {tab === 'amenities' && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {amenityDetails.map((a) => (
                      <div key={a.id} className="flex items-center gap-2 bg-green-50 rounded-xl p-3">
                        <span className="text-xl">{a.icon}</span>
                        <span className="text-sm font-medium text-gray-700">{a.label}</span>
                      </div>
                    ))}
                    {amenityDetails.length === 0 && (
                      <p className="text-gray-500 text-sm col-span-4">Chưa cập nhật tiện ích</p>
                    )}
                  </div>
                )}
                {tab === 'map' && (
                  <div className="space-y-3">
                    <div className="rounded-xl overflow-hidden border border-gray-100 aspect-video">
                      {hasExactCoordinates(room) ? (
                        <HomeMapLeaflet
                          rooms={[room]}
                          selectedId={room.id}
                          onSelectRoom={() => {}}
                          panToSelection={!myLocation}
                          userLocation={myLocation}
                        />
                      ) : (
                        <div className="h-full bg-gray-100 rounded-xl flex items-center justify-center text-center px-6">
                          <div>
                            <div className="text-4xl mb-3">🧭</div>
                            <p className="text-gray-700 font-medium">Tin này chưa suy ra được vị trí trên bản đồ</p>
                            <p className="text-gray-400 text-sm mt-1">Hãy nhập địa chỉ rõ hơn hoặc bổ sung lat/lng để định vị chính xác.</p>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {myLocation ? (
                        <span className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 px-3 py-1.5 text-xs font-semibold">
                          ✓ Đang dùng vị trí của bạn
                          {distanceKm != null && Number.isFinite(distanceKm) && (
                            <> · cách phòng <strong>{formatDistanceKm(distanceKm)}</strong></>
                          )}
                          <button
                            type="button"
                            onClick={() => setMyLocation(null)}
                            className="ml-1 underline hover:no-underline"
                          >
                            Tắt
                          </button>
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={handleGetMyLocation}
                          disabled={locating}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 text-blue-700 px-3 py-1.5 text-xs font-semibold hover:bg-blue-100 disabled:opacity-60"
                        >
                          {locating ? '⏳ Đang định vị...' : '📍 Hiện vị trí của tôi'}
                        </button>
                      )}
                      {hasExactCoordinates(room) && (
                        <button
                          type="button"
                          onClick={openDirections}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 text-xs font-semibold"
                        >
                          🚗 Chỉ đường (Google Maps)
                        </button>
                      )}
                    </div>
                    {myLocationError && (
                      <p className="text-xs bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2">
                        {myLocationError}
                      </p>
                    )}

                    <div className="rounded-xl bg-slate-50 border border-slate-100 px-4 py-3">
                      <p className="text-gray-700 font-medium">{room.address}</p>
                      <p className="text-gray-400 text-sm">{room.city}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Related rooms */}
            {relatedRooms.length > 0 && (
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-4">Phòng tương tự tại {room.city}</h2>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {relatedRooms.map((r) => <RoomCard key={r.id} room={r} />)}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Contact card */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 sticky top-20">
              <div className="flex items-center gap-3 mb-5 pb-5 border-b border-gray-100">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                  {room.landlord?.name?.charAt(0)}
                </div>
                <div>
                  <p className="font-semibold text-gray-900">{room.landlord?.name}</p>
                  <p className="text-xs text-gray-500">Chủ phòng trọ</p>
                  <div className="flex items-center gap-1 mt-0.5">
                    <span className="w-2 h-2 bg-green-500 rounded-full" />
                    <span className="text-xs text-green-600">Đang hoạt động</span>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-2xl font-bold text-blue-600 text-center">
                  {formatPrice(room.price)}<span className="text-sm font-normal text-gray-400">/tháng</span>
                </p>

                {showContact ? (
                  <div className="bg-blue-50 rounded-xl p-4 text-center">
                    <p className="text-sm text-gray-600 mb-1">Số điện thoại</p>
                    <p className="text-xl font-bold text-blue-600">{room.landlord?.phone}</p>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowContact(true)}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3.5 rounded-xl font-semibold transition-colors duration-200 flex items-center justify-center gap-2"
                  >
                    ☎️ Hiện số điện thoại
                  </button>
                )}

                <button className="w-full border-2 border-blue-200 text-blue-600 hover:bg-blue-50 py-3 rounded-xl font-medium transition-colors duration-200 flex items-center justify-center gap-2">
                  📨 Nhắn tin
                </button>

                <button className="w-full border border-gray-200 text-gray-600 hover:bg-gray-50 py-3 rounded-xl font-medium transition-colors text-sm flex items-center justify-center gap-2">
                  🗓️ Đặt lịch xem phòng
                </button>
              </div>

              {/* Safety tips */}
              <div className="mt-4 pt-4 border-t border-gray-100">
                <p className="text-xs text-gray-500 flex items-start gap-1.5">
                  <span className="text-yellow-500 flex-shrink-0 mt-0.5">⚠️</span>
                  Không chuyển tiền cọc trước khi xem phòng. TroHub không chịu trách nhiệm về giao dịch ngoài nền tảng.
                </p>
              </div>
            </div>

            {/* Report */}
            <button className="w-full text-sm text-gray-400 hover:text-red-500 transition-colors py-2">
              🚩 Báo cáo tin đăng này
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoItem({ label, value }) {
  return (
    <div className="bg-gray-50 rounded-lg p-3">
      <p className="text-xs text-gray-500 mb-0.5">{label}</p>
      <p className="text-sm font-semibold text-gray-900">{value}</p>
    </div>
  );
}

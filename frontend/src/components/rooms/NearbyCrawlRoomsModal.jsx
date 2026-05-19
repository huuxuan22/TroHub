import React from 'react';
import { X } from 'lucide-react';
import RoomCard from './RoomCard';

function normalizeAddressPart(value) {
  return String(value || '').replace(/\s+/g, ' ').trim().toLowerCase();
}

function dedupeAddressParts(address) {
  const parts = String(address || '')
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
  const deduped = [];
  const seen = new Set();

  parts.forEach((part) => {
    const key = normalizeAddressPart(part);
    if (!key || seen.has(key)) return;
    seen.add(key);
    deduped.push(part);
  });

  return deduped.join(', ');
}

export default function NearbyCrawlRoomsModal({ open, rooms, userAddress, loading, onClose }) {
  if (!open) return null;
  const normalizedUserAddress = dedupeAddressParts(userAddress);

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="nearby-crawl-title"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 px-6 py-5 border-b border-gray-100">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600 mb-1">Tin mới từ crawl</p>
            <h2 id="nearby-crawl-title" className="text-xl font-bold text-gray-900 leading-snug">
              Đã tìm thấy phòng trọ mới gần khu vực của bạn
            </h2>
            {normalizedUserAddress && (
              <p className="text-sm text-gray-500 mt-1 line-clamp-2">📍 {normalizedUserAddress}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100 text-gray-500 shrink-0"
            aria-label="Đóng"
          >
            <X size={22} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {loading ? (
            <p className="text-center text-gray-500 py-12">Đang tải phòng gần bạn…</p>
          ) : rooms.length === 0 ? (
            <p className="text-center text-gray-500 py-12">Chưa có tin crawl mới gần địa chỉ đã lưu.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {rooms.map((room) => (
                <RoomCard key={room.id} room={room} featured />
              ))}
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-100 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-gray-900 text-white text-sm font-medium hover:bg-gray-800"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}


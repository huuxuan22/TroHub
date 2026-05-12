import React, { useEffect, useMemo } from 'react';
import { MapContainer, Marker, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { DEFAULT_MAP_CENTER, getRoomLatLng } from '../../services/roomApi';

function formatMarkerPrice(price) {
  if (price >= 1_000_000) {
    const t = price / 1_000_000;
    const s = t % 1 === 0 ? String(Math.round(t)) : String(t.toFixed(1)).replace('.0', '');
    return `${s} Trđ`;
  }
  if (price >= 1_000) return `${Math.round(price / 1_000)} Nđ`;
  return `${price} đ`;
}

function makePriceIcon(price, selected) {
  const label = formatMarkerPrice(price);
  const border = selected ? '2px solid #2563eb' : '2px solid #fff';
  const shadow = selected ? '0 4px 14px rgba(37,99,235,0.35)' : '0 2px 10px rgba(0,0,0,0.18)';
  // Đủ kích thước + iconAnchor để Leaflet nhận click (iconSize [0,0] khiến marker gần như không bấm được).
  const w = 168;
  const h = 52;
  return L.divIcon({
    className: 'leaflet-price-marker',
    html: `
      <div style="width:${w}px;height:${h}px;display:flex;align-items:flex-start;justify-content:center;
        pointer-events:auto;box-sizing:border-box;padding-top:2px;">
        <div style="display:flex;align-items:center;gap:6px;background:#fff;padding:6px 12px;border-radius:999px;
          box-shadow:${shadow};border:${border};font-weight:600;font-size:13px;color:#0f172a;white-space:nowrap;
          font-family:system-ui,-apple-system,sans-serif;cursor:pointer;">
          <span style="font-size:14px;line-height:1;">🛏</span>
          <span>${label}</span>
        </div>
      </div>`,
    iconSize: [w, h],
    iconAnchor: [w / 2, h],
  });
}

function FitBounds({ points }) {
  const map = useMap();
  useEffect(() => {
    if (!points.length) return;
    if (points.length === 1) {
      map.setView(points[0], 13);
      return;
    }
    const bounds = L.latLngBounds(points);
    map.fitBounds(bounds, { padding: [48, 48], maxZoom: 14 });
  }, [map, points]);
  return null;
}

function FlyToSelected({ room, center, enabled }) {
  const map = useMap();
  useEffect(() => {
    if (!enabled || !room) return;
    const pos = getRoomLatLng(room, center);
    if (!pos) return;
    map.flyTo(pos, 15, { duration: 0.55 });
  }, [map, room?.id, center, enabled, room]);
  return null;
}

function RoomMarker({ room, selected, onSelect }) {
  const icon = useMemo(
    () => makePriceIcon(room.price, selected),
    [room.price, selected],
  );
  const position = useMemo(() => getRoomLatLng(room), [room.id, room.latitude, room.longitude]);

  if (!position) return null;

  return (
    <Marker
      position={position}
      icon={icon}
      zIndexOffset={selected ? 1000 : 0}
      eventHandlers={{ click: () => onSelect(room.id) }}
    />
  );
}

export default function HomeMapLeaflet({ rooms, selectedId, onSelectRoom, panToSelection }) {
  const mappableRooms = useMemo(
    () => rooms.filter((room) => getRoomLatLng(room)),
    [rooms],
  );
  const selectedRoom = mappableRooms.find((r) => r.id === selectedId) || null;
  const points = useMemo(() => mappableRooms.map((r) => getRoomLatLng(r)), [mappableRooms]);
  const hasMapData = points.length > 0;

  return (
    <div className="relative h-full w-full">
      <MapContainer
        center={DEFAULT_MAP_CENTER}
        zoom={12}
        className="h-full w-full min-h-[280px] z-0"
        scrollWheelZoom
        attributionControl
      >
        <TileLayer
          attribution='&copy; <a href="https://www.esri.com/">Esri</a>, Maxar, Earthstar'
          url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
          maxZoom={19}
        />
        <TileLayer
          attribution=""
          url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"
          maxZoom={19}
          opacity={0.55}
        />
        <FitBounds points={points.filter(Boolean)} />
        <FlyToSelected
          room={selectedRoom}
          center={DEFAULT_MAP_CENTER}
          enabled={Boolean(panToSelection && selectedRoom)}
        />
        {mappableRooms.map((room) => (
          <RoomMarker
            key={room.id}
            room={room}
            selected={selectedId === room.id}
            onSelect={onSelectRoom}
          />
        ))}
      </MapContainer>
      {!hasMapData && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-900/35 backdrop-blur-[1px] px-6 text-center">
          <div className="max-w-sm rounded-2xl bg-white/95 px-4 py-3 text-sm text-slate-700 shadow-lg">
            Chưa có tin nào đủ dữ liệu vị trí để hiển thị trên bản đồ.
          </div>
        </div>
      )}
    </div>
  );
}

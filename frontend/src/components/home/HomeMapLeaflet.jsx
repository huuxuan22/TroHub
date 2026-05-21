import React, { useEffect, useMemo } from 'react';
import { Circle, MapContainer, Marker, TileLayer, Tooltip, useMap } from 'react-leaflet';
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

function makePriceIcon(price, selected, highlighted) {
  const label = formatMarkerPrice(price);
  
  let border = '2px solid #fff';
  let shadow = '0 2px 10px rgba(0,0,0,0.18)';
  let bg = '#fff';
  let color = '#0f172a';
  let emoji = '🛏';
  
  if (highlighted) {
    bg = 'linear-gradient(135deg, #ec4899, #ef4444)'; // beautiful rose to red gradient
    color = '#fff';
    border = selected ? '2px solid #fff' : '2px solid #fecdd3';
    shadow = '0 0 14px rgba(239, 68, 68, 0.6)';
    emoji = '🔥';
  } else if (selected) {
    border = '2px solid #2563eb';
    shadow = '0 4px 14px rgba(37,99,235,0.35)';
  }

  // Đủ kích thước + iconAnchor để Leaflet nhận click (iconSize [0,0] khiến marker gần như không bấm được).
  const w = 168;
  const h = 52;
  return L.divIcon({
    className: 'leaflet-price-marker',
    html: `
      <div style="width:${w}px;height:${h}px;display:flex;align-items:flex-start;justify-content:center;
        pointer-events:auto;box-sizing:border-box;padding-top:2px;">
        <div class="${highlighted ? 'trohub-marker-highlight-pulse' : ''}" style="display:flex;align-items:center;gap:6px;background:${bg};padding:6px 12px;border-radius:999px;
          box-shadow:${shadow};border:${border};font-weight:700;font-size:13px;color:${color};white-space:nowrap;
          font-family:system-ui,-apple-system,sans-serif;cursor:pointer;">
          <span style="font-size:14px;line-height:1;">${emoji}</span>
          <span>${label}</span>
        </div>
      </div>
      <style>
        .trohub-marker-highlight-pulse {
          animation: marker-pulse-glow 1.8s infinite;
        }
        @keyframes marker-pulse-glow {
          0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.8); }
          70% { box-shadow: 0 0 0 8px rgba(239, 68, 68, 0); }
          100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
        }
      </style>`,
    iconSize: [w, h],
    iconAnchor: [w / 2, h],
  });
}

function FitBounds({ points, skip }) {
  const map = useMap();
  useEffect(() => {
    if (skip) return;
    if (!points.length) return;
    if (points.length === 1) {
      map.setView(points[0], 13);
      return;
    }
    const bounds = L.latLngBounds(points);
    map.fitBounds(bounds, { padding: [48, 48], maxZoom: 14 });
  }, [map, points, skip]);
  return null;
}

function FlyToUserLocation({ location }) {
  const map = useMap();
  useEffect(() => {
    if (!location) return;
    map.flyTo([location.latitude, location.longitude], 15, { duration: 0.6 });
  }, [map, location?.latitude, location?.longitude]);
  return null;
}

const USER_LOCATION_ICON = L.divIcon({
  className: 'leaflet-user-location-marker',
  html: `
    <div style="position:relative;width:24px;height:24px;display:flex;align-items:center;justify-content:center;">
      <span style="position:absolute;inset:0;border-radius:9999px;background:#2563eb;opacity:0.25;animation:trohub-pulse 1.6s ease-out infinite;"></span>
      <span style="position:relative;width:14px;height:14px;border-radius:9999px;background:#2563eb;box-shadow:0 0 0 3px #fff,0 2px 6px rgba(37,99,235,0.5);"></span>
    </div>
    <style>@keyframes trohub-pulse { 0% { transform: scale(0.6); opacity: 0.6; } 100% { transform: scale(2.6); opacity: 0; } }</style>
  `,
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

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

function RoomMarker({ room, selected, highlighted, onSelect }) {
  const icon = useMemo(
    () => makePriceIcon(room.price, selected, highlighted),
    [room.price, selected, highlighted],
  );
  const position = useMemo(() => getRoomLatLng(room), [room.id, room.latitude, room.longitude]);

  if (!position) return null;

  return (
    <Marker
      position={position}
      icon={icon}
      zIndexOffset={selected ? 1000 : highlighted ? 500 : 0}
      eventHandlers={{ click: () => onSelect(room.id) }}
    />
  );
}

export default function HomeMapLeaflet({
  rooms,
  selectedId,
  onSelectRoom,
  panToSelection,
  userLocation,
  highlightedRoomIds = [],
}) {
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
        {/* Khi đã có vị trí user thì ưu tiên flyTo, không fit bounds nữa. */}
        <FitBounds points={points.filter(Boolean)} skip={Boolean(userLocation)} />
        <FlyToSelected
          room={selectedRoom}
          center={DEFAULT_MAP_CENTER}
          enabled={Boolean(panToSelection && selectedRoom)}
        />
        <FlyToUserLocation location={userLocation} />

        {userLocation && (
          <>
            <Circle
              center={[userLocation.latitude, userLocation.longitude]}
              radius={Math.max(userLocation.accuracy || 50, 30)}
              pathOptions={{ color: '#2563eb', fillColor: '#3b82f6', fillOpacity: 0.12, weight: 1 }}
            />
            <Marker
              position={[userLocation.latitude, userLocation.longitude]}
              icon={USER_LOCATION_ICON}
              zIndexOffset={2000}
            >
              <Tooltip direction="top" offset={[0, -10]} permanent>
                <span className="text-xs font-semibold text-blue-700">📍 Vị trí của bạn</span>
              </Tooltip>
            </Marker>
          </>
        )}

        {mappableRooms.map((room) => (
          <RoomMarker
            key={room.id}
            room={room}
            selected={selectedId === room.id}
            highlighted={highlightedRoomIds.includes(room.id)}
            onSelect={onSelectRoom}
          />
        ))}
      </MapContainer>
      {!hasMapData && !userLocation && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-900/35 backdrop-blur-[1px] px-6 text-center">
          <div className="max-w-sm rounded-2xl bg-white/95 px-4 py-3 text-sm text-slate-700 shadow-lg">
            Chưa có tin nào đủ dữ liệu vị trí để hiển thị trên bản đồ.
          </div>
        </div>
      )}
    </div>
  );
}

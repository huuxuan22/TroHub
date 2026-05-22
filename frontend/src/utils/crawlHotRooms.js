import { roomMatchesLocationQuery } from './searchText';
import { haversineDistanceKm } from './useGeolocation';

export const NEW_CRAWLED_ROOMS_STORAGE_KEY = 'trohub_new_crawled_rooms';
export const SHOW_HOT_DEALS_NEW_ROOMS_STORAGE_KEY = 'trohub_show_hot_deals_new_rooms';
export const ACTIVE_CRAWL_WATCH_STORAGE_KEY = 'trohub_active_crawl_watch';
export const NEW_CRAWLED_HOT_ROOMS_EVENT = 'trohub_new_crawled_hot_rooms';

export const CRAWL_HOT_REFRESH_DELAYS_MS = [20_000, 45_000, 75_000, 110_000, 150_000, 180_000];

const CRAWL_WATCH_TTL_MS = 3 * 60 * 1000 + 15_000;
const CLOCK_DRIFT_BUFFER_MS = 10_000;
const MAX_HOT_CRAWLED_ROOMS = 10;
const NEAR_ME_MATCH_RADIUS_KM = 10;

function safeLocalStorage() {
  if (typeof window === 'undefined') return null;
  return window.localStorage;
}

function asTime(value) {
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : null;
}

function validCoordinate(value, maxAbs) {
  const n = Number(value);
  return Number.isFinite(n) && Math.abs(n) <= maxAbs ? n : null;
}

function normalizeWatch(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const startedAt = asTime(raw.startedAt);
  const expiresAt = asTime(raw.expiresAt);
  if (!startedAt || !expiresAt || Date.now() > expiresAt) return null;

  const latitude = validCoordinate(raw.latitude, 90);
  const longitude = validCoordinate(raw.longitude, 180);

  return {
    ...raw,
    startedAt: new Date(startedAt).toISOString(),
    expiresAt: new Date(expiresAt).toISOString(),
    keyword: String(raw.keyword || '').trim(),
    locationQuery: String(raw.locationQuery || '').trim(),
    city: String(raw.city || '').trim(),
    latitude,
    longitude,
    nearMe: Boolean(raw.nearMe && latitude !== null && longitude !== null),
  };
}

export function readNewCrawledHotRooms() {
  const storage = safeLocalStorage();
  if (!storage) return [];
  try {
    const parsed = JSON.parse(storage.getItem(NEW_CRAWLED_ROOMS_STORAGE_KEY) || '[]');
    return Array.isArray(parsed) ? parsed.slice(0, MAX_HOT_CRAWLED_ROOMS) : [];
  } catch {
    return [];
  }
}

export function clearNewCrawledHotRooms() {
  const storage = safeLocalStorage();
  if (!storage) return;
  storage.removeItem(NEW_CRAWLED_ROOMS_STORAGE_KEY);
  storage.removeItem(SHOW_HOT_DEALS_NEW_ROOMS_STORAGE_KEY);
}

export function startCrawlHotRoomsWatch({
  source,
  keyword,
  locationQuery,
  city,
  filters,
  latitude,
  longitude,
  accuracy,
  nearMe = false,
} = {}) {
  const storage = safeLocalStorage();
  if (!storage) return null;

  const startedAt = Date.now();
  const watch = normalizeWatch({
    source,
    keyword,
    locationQuery,
    city,
    filters,
    latitude,
    longitude,
    accuracy,
    nearMe,
    startedAt: new Date(startedAt).toISOString(),
    expiresAt: new Date(startedAt + CRAWL_WATCH_TTL_MS).toISOString(),
  });

  if (!watch) return null;
  storage.setItem(ACTIVE_CRAWL_WATCH_STORAGE_KEY, JSON.stringify(watch));
  return watch;
}

export function readActiveCrawlHotRoomsWatch() {
  const storage = safeLocalStorage();
  if (!storage) return null;
  try {
    const watch = normalizeWatch(JSON.parse(storage.getItem(ACTIVE_CRAWL_WATCH_STORAGE_KEY) || 'null'));
    if (!watch) storage.removeItem(ACTIVE_CRAWL_WATCH_STORAGE_KEY);
    return watch;
  } catch {
    storage.removeItem(ACTIVE_CRAWL_WATCH_STORAGE_KEY);
    return null;
  }
}

export function clearActiveCrawlHotRoomsWatch() {
  const storage = safeLocalStorage();
  if (!storage) return;
  storage.removeItem(ACTIVE_CRAWL_WATCH_STORAGE_KEY);
}

export function clearCrawlHotRoomsTimers(timersRef) {
  timersRef.current.forEach((timerId) => window.clearTimeout(timerId));
  timersRef.current = [];
}

export function scheduleCrawlHotRoomsRefresh(timersRef, refreshFn, watch = readActiveCrawlHotRoomsWatch()) {
  clearCrawlHotRoomsTimers(timersRef);
  if (!watch) return;

  const startedAt = asTime(watch.startedAt);
  const expiresAt = asTime(watch.expiresAt);
  if (!startedAt || !expiresAt) return;

  const elapsed = Date.now() - startedAt;
  const remainingDelays = CRAWL_HOT_REFRESH_DELAYS_MS
    .map((delay) => delay - elapsed)
    .filter((delay) => delay > 0 && Date.now() + delay <= expiresAt + 1000);

  timersRef.current = remainingDelays.map((delay) =>
    window.setTimeout(refreshFn, delay),
  );
}

export function hasCrawlHotRoomsSearchSignal({ keyword, city, filters, nearMe } = {}) {
  if (nearMe) return true;
  if (String(keyword || '').trim() || String(city || '').trim()) return true;
  if (!filters || typeof filters !== 'object') return false;
  if (filters.near_me) return true;

  return [
    filters.type,
    filters.room_type,
    filters.priceRange,
    filters.min_price,
    filters.max_price,
    filters.minArea,
    filters.maxArea,
    filters.min_area,
    filters.max_area,
    filters.budget_min,
    filters.budget_max,
    filters.latitude,
    filters.longitude,
  ].some((value) => value !== undefined && value !== null && value !== '');
}

function roomDistanceFromWatch(room, watch) {
  if (!watch?.nearMe || watch.latitude == null || watch.longitude == null) return null;
  if (room.latitude == null || room.longitude == null) return null;
  const km = haversineDistanceKm(watch.latitude, watch.longitude, room.latitude, room.longitude);
  return Number.isFinite(km) ? km : null;
}

export function roomMatchesActiveCrawlWatch(room, watch) {
  if (!room || String(room.source || '').toLowerCase() !== 'crawl') return false;

  const startedAt = asTime(watch?.startedAt);
  const roomTime = asTime(room.postedAt);
  if (!startedAt || !roomTime || roomTime < startedAt - CLOCK_DRIFT_BUFFER_MS) return false;

  const distanceKm = roomDistanceFromWatch(room, watch);
  if (distanceKm !== null && distanceKm <= NEAR_ME_MATCH_RADIUS_KM) return true;

  const locationText = [watch?.locationQuery, watch?.keyword, watch?.city].filter(Boolean).join(' ').trim();
  if (locationText) return roomMatchesLocationQuery(room, locationText);

  return Boolean(watch?.nearMe);
}

export function collectNewCrawledHotRooms(rooms, watch = readActiveCrawlHotRoomsWatch()) {
  if (!watch || !Array.isArray(rooms)) return [];
  return rooms.filter((room) => roomMatchesActiveCrawlWatch(room, watch));
}

function withCrawlHotBadge(room, watch) {
  const distanceKm = roomDistanceFromWatch(room, watch);
  const customBadge =
    distanceKm !== null && distanceKm <= NEAR_ME_MATCH_RADIUS_KM
      ? { type: 'near_me', label: '📍 GẦN BẠN' }
      : { type: 'new_crawl', label: '✨ MỚI CÀO' };

  return { ...room, customBadge };
}

export function mergeNewCrawledHotRooms(existingRooms, candidateRooms, watch = readActiveCrawlHotRoomsWatch()) {
  const storage = safeLocalStorage();
  const existing = Array.isArray(existingRooms) ? existingRooms : [];
  if (!watch || !Array.isArray(candidateRooms) || candidateRooms.length === 0) return existing;

  const existingIds = new Set(existing.map((room) => room?.id).filter(Boolean));
  const freshCandidates = candidateRooms.filter((room) => room?.id && !existingIds.has(room.id));
  if (!freshCandidates.length) return existing.slice(0, MAX_HOT_CRAWLED_ROOMS);

  const seen = new Set();
  const merged = [];

  [...freshCandidates.map((room) => withCrawlHotBadge(room, watch)), ...existing].forEach((room) => {
    if (!room?.id || seen.has(room.id)) return;
    seen.add(room.id);
    merged.push(room);
  });

  const capped = merged.slice(0, MAX_HOT_CRAWLED_ROOMS);
  if (storage && capped.length) {
    storage.setItem(NEW_CRAWLED_ROOMS_STORAGE_KEY, JSON.stringify(capped));
    storage.setItem(SHOW_HOT_DEALS_NEW_ROOMS_STORAGE_KEY, 'true');
    window.dispatchEvent(new CustomEvent(NEW_CRAWLED_HOT_ROOMS_EVENT, { detail: capped }));
  }
  return capped;
}

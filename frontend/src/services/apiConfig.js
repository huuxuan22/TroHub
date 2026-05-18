const DEFAULT_API_BASE_URL = 'http://127.0.0.1:8000';
const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '0.0.0.0', '::1', '[::1]']);

function trimTrailingSlash(value) {
  return String(value || '').trim().replace(/\/+$/, '');
}

function isLoopbackHost(hostname) {
  return LOOPBACK_HOSTS.has(String(hostname || '').toLowerCase());
}

function browserHostname() {
  if (typeof window === 'undefined') return '';
  return window.location?.hostname || '';
}

function viteEnv() {
  return import.meta.env || {};
}

export function resolveApiBaseUrl(rawBaseUrl) {
  const env = viteEnv();
  const configuredBaseUrl = trimTrailingSlash(
    rawBaseUrl || env.VITE_API_BASE_URL || env.VITE_API_BASE || DEFAULT_API_BASE_URL,
  );

  try {
    const apiUrl = new URL(configuredBaseUrl);
    const currentHost = browserHostname();

    if (currentHost && !isLoopbackHost(currentHost) && isLoopbackHost(apiUrl.hostname)) {
      apiUrl.hostname = currentHost;
    }

    return trimTrailingSlash(apiUrl.toString());
  } catch {
    return configuredBaseUrl || DEFAULT_API_BASE_URL;
  }
}

export const API_BASE_URL = resolveApiBaseUrl();

export function buildApiUrl(path) {
  return `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
}

export function buildWsUrl(path) {
  const apiUrl = new URL(API_BASE_URL);
  apiUrl.protocol = apiUrl.protocol === 'https:' ? 'wss:' : 'ws:';
  apiUrl.pathname = path.startsWith('/') ? path : `/${path}`;
  apiUrl.search = '';
  apiUrl.hash = '';
  return apiUrl;
}

/* services/api.ts - Cached API with 5min TTL */
import { apiUrl } from 'apiurl';
import { getCache, setCache } from '../cache';

/**
 * Build cache key: endpoint + params + auth flag.
 * Handles query params in endpoint (e.g., ?dealerid=123).
 */
function buildKey(endpoint: string, token?: string): string {
  return `${endpoint}_${token ? 'auth' : 'public'}`;
}

async function parseResponseBody(res: Response) {
  const text = await res.text();
  let data: any = null;

  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  if (!res.ok) {
    const message =
      typeof data === 'object' && data !== null && 'message' in data
        ? String(data.message)
        : typeof data === 'string' && data
          ? data
          : `Request failed with status ${res.status}`;

    console.error('API ERROR:', {
      url: res.url,
      status: res.status,
      response: data,
    });

    throw new Error(message);
  }

  return data ?? [];
}

async function request(endpoint: string, token?: string) {
  const res = await fetch(`${apiUrl}${endpoint}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      'Cache-Control': 'public, max-age=300',
    },
  });

  return parseResponseBody(res);
}

/**
 * Cached wrapper for apiGet. Checks cache first, fetches if miss/expired.
 */
export async function cachedGet(endpoint: string, token?: string): Promise<any> {
  const key = buildKey(endpoint, token);
  let data = getCache(key);

  if (data === null) {
    data = await request(endpoint, token);
    setCache(key, data); // Cache for 5min
  }

  return data;
}

// Original apiGet (uncached, for mutations/writes)
export async function apiGet(endpoint: string, token?: string) {
  return request(endpoint, token);
}

// Utils: clear on logout/cart-clear etc.
export { clearCache } from '../cache';


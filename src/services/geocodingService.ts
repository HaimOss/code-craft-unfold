/**
 * Shared geocoding service (Nominatim / OpenStreetMap).
 *
 * Why this exists: full POI addresses such as
 * "Salzwelten Salzburg, Ramsaustraße 3, 5422 Bad Dürrnberg, Austria"
 * return zero results on Nominatim, so most trip locations silently
 * disappeared from the maps. We now try progressively simpler variants of
 * every address until one resolves, throttle requests globally (Nominatim
 * allows ~1 req/sec) and cache results in localStorage between sessions.
 */

export interface LatLng { lat: number; lng: number }

const STORAGE_KEY = 'geocode-cache-v1';
const MIN_INTERVAL_MS = 1100;
const FAILURE_TTL_MS = 1000 * 60 * 60 * 24; // retry failed lookups after a day

interface CacheEntry { coords: LatLng | null; ts: number }

const memoryCache = new Map<string, CacheEntry>();
const inflight = new Map<string, Promise<LatLng | null>>();

function loadCache() {
  if (typeof localStorage === 'undefined') return;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as Record<string, CacheEntry>;
    Object.entries(parsed).forEach(([k, v]) => memoryCache.set(k, v));
  } catch {
    /* ignore corrupt cache */
  }
}
loadCache();

let persistTimer: ReturnType<typeof setTimeout> | null = null;
function persistCache() {
  if (typeof localStorage === 'undefined') return;
  if (persistTimer) clearTimeout(persistTimer);
  persistTimer = setTimeout(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(Object.fromEntries(memoryCache)));
    } catch {
      /* quota exceeded – ignore */
    }
  }, 500);
}

const normalize = (s: string) => s.trim().replace(/\s+/g, ' ').toLowerCase();

/**
 * Build progressively looser query variants for a single address string.
 * Example: "Wild- & Erlebnispark Ferleiten, Ferleiten 2, 5672 Fusch, Austria"
 *  -> full string
 *  -> "Ferleiten 2, 5672 Fusch, Austria"   (drop the POI name)
 *  -> "Wild- & Erlebnispark Ferleiten, 5672 Fusch, Austria"
 *  -> "5672 Fusch, Austria"
 *  -> "Fusch, Austria"                     (city + country)
 */
export function buildQueryVariants(location: string): string[] {
  const cleaned = location.replace(/\s*\([^)]*\)/g, ' ').replace(/\s+/g, ' ').trim();
  const parts = cleaned.split(',').map(p => p.trim()).filter(Boolean);
  const variants: string[] = [location.trim()];

  if (cleaned !== location.trim()) variants.push(cleaned);
  if (parts.length > 2) variants.push(parts.slice(1).join(', '));
  if (parts.length >= 2) {
    variants.push(`${parts[0]}, ${parts.slice(-2).join(', ')}`);
    variants.push(parts.slice(-2).join(', '));
  }
  if (parts.length >= 3) {
    const cityNoZip = parts[parts.length - 2].replace(/^\d{3,6}\s*/, '').trim();
    if (cityNoZip) variants.push(`${cityNoZip}, ${parts[parts.length - 1]}`);
  }
  if (parts.length === 1) {
    // "TLV → MUC" style: try each side of an arrow separately
    cleaned.split(/→|->|–|—/).map(s => s.trim()).filter(Boolean).forEach(s => variants.push(s));
  }

  const seen = new Set<string>();
  return variants.filter(v => {
    const key = normalize(v);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// Global serialized queue so concurrent maps never exceed Nominatim's rate limit.
let queue: Promise<unknown> = Promise.resolve();
let lastRequestAt = 0;

function enqueue<T>(task: () => Promise<T>): Promise<T> {
  const run = queue.then(async () => {
    const wait = MIN_INTERVAL_MS - (Date.now() - lastRequestAt);
    if (wait > 0) await new Promise(r => setTimeout(r, wait));
    lastRequestAt = Date.now();
    return task();
  });
  queue = run.catch(() => undefined);
  return run;
}

async function fetchNominatim(query: string): Promise<LatLng | null> {
  const res = await fetch(
    `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(query)}`,
    { headers: { 'Accept-Language': 'en' } }
  );
  if (!res.ok) throw new Error(`Nominatim ${res.status}`);
  const data = await res.json();
  if (Array.isArray(data) && data.length > 0) {
    return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
  }
  return null;
}

export async function geocodeLocation(location: string): Promise<LatLng | null> {
  if (!location || !location.trim()) return null;
  const key = normalize(location);

  const cached = memoryCache.get(key);
  if (cached && (cached.coords || Date.now() - cached.ts < FAILURE_TTL_MS)) {
    return cached.coords;
  }

  const existing = inflight.get(key);
  if (existing) return existing;

  const promise = (async () => {
    let coords: LatLng | null = null;
    for (const variant of buildQueryVariants(location)) {
      const variantKey = normalize(variant);
      const variantCached = memoryCache.get(variantKey);
      if (variantCached?.coords) { coords = variantCached.coords; break; }

      try {
        coords = await enqueue(() => fetchNominatim(variant));
      } catch (e) {
        console.warn('Geocode request failed for', variant, e);
        coords = null;
      }
      if (coords) {
        memoryCache.set(variantKey, { coords, ts: Date.now() });
        break;
      }
      memoryCache.set(variantKey, { coords: null, ts: Date.now() });
    }
    memoryCache.set(key, { coords, ts: Date.now() });
    persistCache();
    if (!coords) console.warn('Geocode: no result for', location);
    return coords;
  })();

  inflight.set(key, promise);
  try {
    return await promise;
  } finally {
    inflight.delete(key);
  }
}

/** Geocode many locations, de-duplicating identical strings. */
export async function geocodeMany(locations: string[]): Promise<Map<string, LatLng | null>> {
  const unique = Array.from(new Set(locations.filter(Boolean)));
  const results = await Promise.all(unique.map(l => geocodeLocation(l)));
  const map = new Map<string, LatLng | null>();
  unique.forEach((l, i) => map.set(l, results[i]));
  return map;
}

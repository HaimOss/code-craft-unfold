import React, { useState, useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Event, EventCategory, DailyInfo } from '@/types';
import { getLocationFromEvent } from '@/utils/helpers';
import { CATEGORY_ICONS } from '@/constants';
import { Loader2 } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

const CATEGORY_COLORS: Record<string, string> = {
  [EventCategory.Flights]: '#0ea5e9',
  [EventCategory.Accommodation]: '#a855f7',
  [EventCategory.Transport]: '#14b8a6',
  [EventCategory.Activity]: '#3b82f6',
  [EventCategory.Food]: '#f97316',
  [EventCategory.Shopping]: '#ec4899',
  [EventCategory.General]: '#6b7280',
};

const geocodeCache = new Map<string, { lat: number; lng: number } | null>();

async function geocodeLocation(location: string): Promise<{ lat: number; lng: number } | null> {
  if (geocodeCache.has(location)) return geocodeCache.get(location)!;
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(location)}&limit=1`,
      { headers: { 'Accept-Language': 'en' } }
    );
    const data = await res.json();
    if (data.length > 0) {
      const result = { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
      geocodeCache.set(location, result);
      return result;
    }
  } catch (e) {
    console.error('Geocode error:', e);
  }
  geocodeCache.set(location, null);
  return null;
}

function createCategoryIcon(category: EventCategory, color: string) {
  return L.divIcon({
    className: 'custom-map-marker',
    html: `<div style="
      background: ${color};
      width: 28px; height: 28px;
      border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      font-size: 14px;
      border: 2px solid white;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
    ">${CATEGORY_ICONS[category] || '📌'}</div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -16],
  });
}

function FitBounds({ positions }: { positions: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (positions.length > 0) {
      const bounds = L.latLngBounds(positions.map(p => L.latLng(p[0], p[1])));
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
    }
  }, [positions, map]);
  return null;
}

interface DayMapProps {
  events: Event[];
  dailyInfo: DailyInfo;
  destination?: string | null;
}

interface GeocodedItem {
  label: string;
  lat: number;
  lng: number;
  type: 'event' | 'start' | 'end';
  event?: Event;
}

const DayMap: React.FC<DayMapProps> = ({ events, dailyInfo, destination }) => {
  const { t } = useLanguage();
  const [items, setItems] = useState<GeocodedItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const geocodeAll = async () => {
      setLoading(true);
      const results: GeocodedItem[] = [];

      // Start point
      if (dailyInfo.startPoint) {
        const coords = await geocodeLocation(dailyInfo.startPoint);
        if (coords) results.push({ label: dailyInfo.startPoint, ...coords, type: 'start' });
      }

      // Events
      for (const event of events) {
        const loc = getLocationFromEvent(event);
        if (!loc) continue;
        const coords = await geocodeLocation(loc);
        if (coords) results.push({ label: loc, ...coords, type: 'event', event });
        await new Promise(r => setTimeout(r, 200));
      }

      // End point
      if (dailyInfo.endPoint) {
        const coords = await geocodeLocation(dailyInfo.endPoint);
        if (coords) results.push({ label: dailyInfo.endPoint, ...coords, type: 'end' });
      }

      setItems(results);
      setLoading(false);
    };
    geocodeAll();
  }, [events, dailyInfo]);

  const positions = useMemo(() => items.map(i => [i.lat, i.lng] as [number, number]), [items]);

  // Group items with same coords (11m precision). Events group together;
  // start/end points dedupe against each other and against events.
  const groupedItems = useMemo(() => {
    const groups = new Map<string, GeocodedItem[]>();
    for (const it of items) {
      const key = `${it.lat.toFixed(4)},${it.lng.toFixed(4)}`;
      const arr = groups.get(key) ?? [];
      arr.push(it);
      groups.set(key, arr);
    }
    return Array.from(groups.values());
  }, [items]);

  const defaultCenter: [number, number] = useMemo(() => {
    if (positions.length > 0) return positions[0];
    return [32.0, 34.8];
  }, [positions]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8 gap-2 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span className="text-sm">{t('map.loadingMap')}</span>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-6 text-muted-foreground text-sm">
        🗺️ {t('map.noLocationsDayDesc')}
      </div>
    );
  }

  return (
    <div className="rounded-xl overflow-hidden border border-border mt-3 mb-2">
      <div className="h-[250px] sm:h-[300px] relative z-0">
        <MapContainer
          center={defaultCenter}
          zoom={13}
          style={{ height: '100%', width: '100%' }}
          scrollWheelZoom={true}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <FitBounds positions={positions} />

          {groupedItems.map((group, gIdx) => {
            const first = group[0];
            // Prefer an event for the icon; else use start/end styling.
            const eventInGroup = group.find(g => g.type === 'event' && g.event);
            if (eventInGroup && eventInGroup.event) {
              const events = group.filter(g => g.type === 'event' && g.event);
              const points = group.filter(g => g.type !== 'event');
              return (
                <Marker
                  key={`grp-${gIdx}`}
                  position={[first.lat, first.lng]}
                  icon={createCategoryIcon(eventInGroup.event.category as EventCategory, CATEGORY_COLORS[eventInGroup.event.category] || '#6b7280')}
                >
                  <Popup>
                    <div className="text-sm min-w-[160px] max-h-[200px] overflow-y-auto">
                      {group.length > 1 && (
                        <div className="text-xs text-gray-500 mb-1">{group.length} פריטים כאן</div>
                      )}
                      {points.map((p, i) => (
                        <div key={`p-${i}`} className="text-xs text-gray-600 mb-1">
                          {p.type === 'start' ? `📍 ${t('map.startPoint')}` : `🏁 ${t('map.endPoint')}`}
                        </div>
                      ))}
                      {events.map((ge, i) => (
                        <div key={ge.event!.id} className={i > 0 ? 'mt-2 pt-2 border-t border-gray-200' : ''}>
                          <div className="font-bold">{ge.event!.title}</div>
                          <div style={{ color: '#6b7280' }}>{ge.event!.time} · {ge.label}</div>
                        </div>
                      ))}
                    </div>
                  </Popup>
                </Marker>
              );
            }
            // Only start/end points here — collapse duplicates; prefer 'start' if both.
            const hasStart = group.some(g => g.type === 'start');
            const item = hasStart ? group.find(g => g.type === 'start')! : group[0];
            return (
              <Marker
                key={`pt-${gIdx}`}
                position={[item.lat, item.lng]}
                icon={L.divIcon({
                  className: 'custom-map-marker',
                  html: `<div style="
                    background: ${item.type === 'start' ? '#22c55e' : '#ef4444'};
                    width: 28px; height: 28px;
                    border-radius: 50%;
                    display: flex; align-items: center; justify-content: center;
                    font-size: 14px;
                    border: 2px solid white;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.3);
                  ">${item.type === 'start' ? '🟢' : '🔴'}</div>`,
                  iconSize: [28, 28],
                  iconAnchor: [14, 14],
                  popupAnchor: [0, -16],
                })}
              >
                <Popup>
                  <div className="text-sm">
                    <div className="font-bold">{item.label}</div>
                    <div style={{ color: '#6b7280' }}>{item.type === 'start' ? `📍 ${t('map.startPoint')}` : `🏁 ${t('map.endPoint')}`}</div>
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>
      </div>
    </div>
  );
};

export default DayMap;

import React, { useState, useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Trip, Event, EventCategory } from '@/types';
import { getLocationFromEvent } from '@/utils/helpers';
import { CATEGORY_ICONS } from '@/constants';
import { Loader2 } from 'lucide-react';

// Fix default marker icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const CATEGORY_COLORS: Record<string, string> = {
  [EventCategory.Flights]: '#0ea5e9',
  [EventCategory.Accommodation]: '#a855f7',
  [EventCategory.Transport]: '#14b8a6',
  [EventCategory.Activity]: '#3b82f6',
  [EventCategory.Food]: '#f97316',
  [EventCategory.Shopping]: '#ec4899',
  [EventCategory.General]: '#6b7280',
};

const DAY_COLORS = [
  '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6',
  '#ec4899', '#14b8a6', '#f97316', '#6366f1', '#84cc16',
];

interface GeocodedEvent {
  event: Event;
  lat: number;
  lng: number;
  dayIndex: number;
}

interface GeocodedPoint {
  label: string;
  type: 'start' | 'end';
  lat: number;
  lng: number;
  dayIndex: number;
}

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
      width: 32px; height: 32px;
      border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      font-size: 16px;
      border: 2px solid white;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
    ">${CATEGORY_ICONS[category] || '📌'}</div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -18],
  });
}

function FitBounds({ positions }: { positions: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (positions.length > 0) {
      const bounds = L.latLngBounds(positions.map(p => L.latLng(p[0], p[1])));
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
    }
  }, [positions, map]);
  return null;
}

interface TripMapProps {
  trip: Trip;
}

const TripMap: React.FC<TripMapProps> = ({ trip }) => {
  const [geocodedEvents, setGeocodedEvents] = useState<GeocodedEvent[]>([]);
  const [geocodedPoints, setGeocodedPoints] = useState<GeocodedPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  const tripDays = useMemo(() => {
    if (!trip.start_date || !trip.end_date) return [];
    const days: string[] = [];
    const start = new Date(trip.start_date + 'T00:00:00');
    const end = new Date(trip.end_date + 'T00:00:00');
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) return [];
    let current = new Date(start);
    while (current <= end) {
      const y = current.getFullYear();
      const m = String(current.getMonth() + 1).padStart(2, '0');
      const d = String(current.getDate()).padStart(2, '0');
      days.push(`${y}-${m}-${d}`);
      current.setDate(current.getDate() + 1);
    }
    return days;
  }, [trip.start_date, trip.end_date]);

  useEffect(() => {
    const geocodeAll = async () => {
      setLoading(true);
      const results: GeocodedEvent[] = [];
      const pointResults: GeocodedPoint[] = [];

      // Geocode daily_info start/end points
      const dailyInfo = (trip as any).daily_info || {};
      for (const [date, info] of Object.entries(dailyInfo)) {
        const dayIndex = tripDays.indexOf(date);
        if (dayIndex === -1) continue;
        const dayInfo = info as any;
        if (dayInfo?.startPoint) {
          const coords = await geocodeLocation(dayInfo.startPoint);
          if (coords) {
            pointResults.push({ label: dayInfo.startPoint, type: 'start', ...coords, dayIndex });
          }
          await new Promise(r => setTimeout(r, 300));
        }
        if (dayInfo?.endPoint) {
          const coords = await geocodeLocation(dayInfo.endPoint);
          if (coords) {
            pointResults.push({ label: dayInfo.endPoint, type: 'end', ...coords, dayIndex });
          }
          await new Promise(r => setTimeout(r, 300));
        }
      }

      // Geocode events
      for (const event of trip.events) {
        const location = getLocationFromEvent(event);
        if (!location) continue;

        const coords = await geocodeLocation(location);
        if (coords) {
          const dayIndex = tripDays.indexOf(event.date);
          results.push({ event, ...coords, dayIndex });
        }
        await new Promise(r => setTimeout(r, 300));
      }

      setGeocodedEvents(results);
      setGeocodedPoints(pointResults);
      setLoading(false);
    };

    geocodeAll();
  }, [trip.events, tripDays, (trip as any).daily_info]);

  const filteredEvents = selectedDay !== null
    ? geocodedEvents.filter(e => e.dayIndex === selectedDay)
    : geocodedEvents;

  const filteredPoints = selectedDay !== null
    ? geocodedPoints.filter(p => p.dayIndex === selectedDay)
    : geocodedPoints;

  const positions: [number, number][] = [
    ...filteredEvents.map(e => [e.lat, e.lng] as [number, number]),
    ...filteredPoints.map(p => [p.lat, p.lng] as [number, number]),
  ];

  // Group events by day for polylines
  const dayRoutes = useMemo(() => {
    const routes: { dayIndex: number; positions: [number, number][] }[] = [];
    const byDay = new Map<number, GeocodedEvent[]>();
    
    const eventsToUse = selectedDay !== null
      ? geocodedEvents.filter(e => e.dayIndex === selectedDay)
      : geocodedEvents;

    eventsToUse.forEach(e => {
      if (!byDay.has(e.dayIndex)) byDay.set(e.dayIndex, []);
      byDay.get(e.dayIndex)!.push(e);
    });

    byDay.forEach((events, dayIndex) => {
      const sorted = events.sort((a, b) => a.event.time.localeCompare(b.event.time));
      if (sorted.length > 1) {
        routes.push({
          dayIndex,
          positions: sorted.map(e => [e.lat, e.lng]),
        });
      }
    });

    return routes;
  }, [geocodedEvents, selectedDay]);

  if (loading) {
    return (
      <div className="card-surface p-12 flex flex-col items-center justify-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground text-sm">טוען מפה ומאתר מיקומים...</p>
      </div>
    );
  }

  if (geocodedEvents.length === 0 && geocodedPoints.length === 0) {
    return (
      <div className="card-surface p-12 flex flex-col items-center justify-center text-center">
        <p className="text-4xl mb-4">🗺️</p>
        <h3 className="text-xl font-bold font-display mb-2">אין מיקומים להציג</h3>
        <p className="text-muted-foreground text-sm">הוסף כתובות ומיקומים לפעילויות כדי לראות אותן על המפה.</p>
      </div>
    );
  }

  return (
    <div className="card-surface overflow-hidden rounded-xl">
      {/* Day filter */}
      <div className="p-3 border-b border-border flex gap-2 overflow-x-auto">
        <button
          onClick={() => setSelectedDay(null)}
          className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
            selectedDay === null
              ? 'bg-primary text-primary-foreground'
              : 'bg-secondary text-muted-foreground hover:text-foreground'
          }`}
        >
          כל הימים
        </button>
        {tripDays.map((day, idx) => {
          const hasEvents = geocodedEvents.some(e => e.dayIndex === idx) || geocodedPoints.some(p => p.dayIndex === idx);
          if (!hasEvents) return null;
          const dayDate = new Date(day + 'T00:00:00');
          return (
            <button
              key={day}
              onClick={() => setSelectedDay(selectedDay === idx ? null : idx)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                selectedDay === idx
                  ? 'text-primary-foreground'
                  : 'bg-secondary text-muted-foreground hover:text-foreground'
              }`}
              style={selectedDay === idx ? { backgroundColor: DAY_COLORS[idx % DAY_COLORS.length] } : undefined}
            >
              יום {idx + 1} · {dayDate.getDate()}/{dayDate.getMonth() + 1}
            </button>
          );
        })}
      </div>

      {/* Map */}
      <div className="h-[500px] relative z-0">
        <MapContainer
          center={positions[0] || [32.0, 34.8]}
          zoom={13}
          style={{ height: '100%', width: '100%' }}
          scrollWheelZoom={true}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <FitBounds positions={positions} />

          {filteredEvents.map((ge) => (
            <Marker
              key={ge.event.id}
              position={[ge.lat, ge.lng]}
              icon={createCategoryIcon(ge.event.category as EventCategory, CATEGORY_COLORS[ge.event.category] || '#6b7280')}
            >
              <Popup>
                <div className="text-sm min-w-[180px]">
                  <div className="font-bold text-base mb-1">{ge.event.title}</div>
                  <div className="text-gray-500 mb-1">
                    יום {ge.dayIndex + 1} · {ge.event.time}
                  </div>
                  {ge.event.notes && (
                    <div className="text-gray-600 text-xs mt-1">{ge.event.notes}</div>
                  )}
                  {ge.event.rating && (
                    <div className="text-yellow-500 text-xs mt-1">
                      {'★'.repeat(ge.event.rating)}{'☆'.repeat(5 - ge.event.rating)}
                    </div>
                  )}
                </div>
              </Popup>
            </Marker>
          ))}

          {dayRoutes.map((route) => (
            <Polyline
              key={`route-${route.dayIndex}`}
              positions={route.positions}
              pathOptions={{
                color: DAY_COLORS[route.dayIndex % DAY_COLORS.length],
                weight: 3,
                opacity: 0.7,
                dashArray: '8, 8',
              }}
            />
          ))}
        </MapContainer>
      </div>

      {/* Legend */}
      <div className="p-3 border-t border-border flex flex-wrap gap-3 text-xs text-muted-foreground">
        <span className="font-medium">מקרא:</span>
        {Object.entries(CATEGORY_COLORS).map(([cat, color]) => {
          const hasCategory = filteredEvents.some(e => e.event.category === cat);
          if (!hasCategory) return null;
          return (
            <span key={cat} className="flex items-center gap-1">
              <span
                className="w-3 h-3 rounded-full inline-block"
                style={{ backgroundColor: color }}
              />
              {CATEGORY_ICONS[cat as EventCategory]} {cat.split(' ')[0]}
            </span>
          );
        })}
      </div>
    </div>
  );
};

export default TripMap;

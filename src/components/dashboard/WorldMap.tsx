import React, { useState, useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Trip } from '@/types';
import { CURRENCY_SYMBOLS } from '@/constants';
import { X, MapPin, Calendar, ArrowLeft, ArrowRight } from 'lucide-react';
import { differenceInDays, parseISO } from 'date-fns';
import { useLanguage } from '@/contexts/LanguageContext';

// Fix leaflet default icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

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

function createTripIcon(color: string) {
  return L.divIcon({
    className: 'custom-map-marker',
    html: `<div style="
      background: ${color};
      width: 36px; height: 36px;
      border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      font-size: 18px;
      border: 3px solid white;
      box-shadow: 0 3px 12px rgba(0,0,0,0.3);
      cursor: pointer;
    ">✈️</div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -20],
  });
}

const TRIP_COLORS = ['#6366f1', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#ec4899', '#0ea5e9', '#14b8a6'];

function FitBounds({ positions }: { positions: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (positions.length > 0) {
      const bounds = L.latLngBounds(positions.map(p => L.latLng(p[0], p[1])));
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 6 });
    }
  }, [positions, map]);
  return null;
}

interface GeocodedTrip {
  trip: Trip;
  lat: number;
  lng: number;
}

interface WorldMapProps {
  trips: Trip[];
  onSelectTrip: (tripId: string) => void;
  onClose: () => void;
}

const WorldMap: React.FC<WorldMapProps> = ({ trips, onSelectTrip, onClose }) => {
  const { t, dir, isRTL } = useLanguage();
  const [geocodedTrips, setGeocodedTrips] = useState<GeocodedTrip[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const geocodeAll = async () => {
      setLoading(true);
      const results: GeocodedTrip[] = [];
      for (const trip of trips) {
        if (!trip.destination) continue;
        const coords = await geocodeLocation(trip.destination);
        if (coords) results.push({ trip, ...coords });
        await new Promise(r => setTimeout(r, 250));
      }
      setGeocodedTrips(results);
      setLoading(false);
    };
    geocodeAll();
  }, [trips]);

  const positions = useMemo(() => geocodedTrips.map(g => [g.lat, g.lng] as [number, number]), [geocodedTrips]);
  const DetailArrow = isRTL ? ArrowLeft : ArrowRight;

  return (
    <div className="fixed inset-0 z-50 bg-foreground/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-5xl h-[80vh] flex flex-col overflow-hidden animate-in zoom-in-95 fade-in duration-200"
        onClick={e => e.stopPropagation()}
        dir={dir}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-xl font-bold font-display flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            {t('dashboard.destinations')}
          </h2>
          <button onClick={onClose} className="btn-ghost p-2 rounded-lg">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Map */}
        <div className="flex-1 relative">
          {loading && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-card/80 backdrop-blur-sm">
              <div className="text-center">
                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">{t('trip.loadingMap')}</p>
              </div>
            </div>
          )}
          <MapContainer
            center={[25, 20]}
            zoom={2}
            style={{ height: '100%', width: '100%' }}
            scrollWheelZoom={true}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {positions.length > 0 && <FitBounds positions={positions} />}

            {geocodedTrips.map((gt, idx) => {
              const daysUntil = differenceInDays(parseISO(gt.trip.start_date), new Date());
              const totalCost = gt.trip.events.reduce((s, e) => s + e.amount, 0);
              const symbol = CURRENCY_SYMBOLS[gt.trip.base_currency] || gt.trip.base_currency;
              const color = TRIP_COLORS[idx % TRIP_COLORS.length];

              return (
                <Marker
                  key={gt.trip.id}
                  position={[gt.lat, gt.lng]}
                  icon={createTripIcon(color)}
                >
                  <Popup>
                    <div className="min-w-[200px] p-1" dir={dir}>
                      {gt.trip.cover_image && (
                        <img
                          src={gt.trip.cover_image}
                          alt={gt.trip.name}
                          className="w-full h-24 object-cover rounded-lg mb-2"
                        />
                      )}
                      <h3 className="font-bold text-sm mb-1" style={{ color: '#1e1e32' }}>{gt.trip.name}</h3>
                      <p className="text-xs flex items-center gap-1 mb-1" style={{ color: '#6b7280' }}>
                        <span>📍</span> {gt.trip.destination}
                      </p>
                      <p className="text-xs mb-1" style={{ color: '#6b7280' }}>
                        📅 {gt.trip.start_date} – {gt.trip.end_date}
                      </p>
                      {daysUntil > 0 && (
                        <p className="text-xs font-medium mb-1" style={{ color: '#6366f1' }}>
                          {t('dashboard.inDays', { count: daysUntil })}
                        </p>
                      )}
                      {totalCost > 0 && (
                        <p className="text-xs font-bold mb-2" style={{ color: '#e67832' }}>
                          {symbol}{totalCost.toLocaleString()}
                        </p>
                      )}
                      <button
                        onClick={() => { onSelectTrip(gt.trip.id); onClose(); }}
                        className="w-full text-center text-xs font-medium py-1.5 px-3 rounded-lg"
                        style={{ background: '#6366f1', color: 'white' }}
                      >
                        {t('dashboard.tripDetails')} →
                      </button>
                    </div>
                  </Popup>
                </Marker>
              );
            })}
          </MapContainer>
        </div>
      </div>
    </div>
  );
};

export default WorldMap;

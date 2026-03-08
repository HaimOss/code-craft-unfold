import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Search, MapPin, Plane, Calendar, X } from 'lucide-react';
import UserProfileMenu from '@/components/UserProfileMenu';
import NotificationBell from '@/components/NotificationBell';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Input } from '@/components/ui/input';
import { Trip } from '@/types';
import { CATEGORY_DISPLAY_CONFIG } from '@/constants';

interface SearchResult {
  type: 'trip' | 'event' | 'destination';
  tripId: string;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
}

interface TopBarProps {
  onLogout: () => void;
  onSelectTrip?: (tripId: string) => void;
  trips?: Trip[];
}

const TopBar: React.FC<TopBarProps> = ({ onLogout, onSelectTrip, trips = [] }) => {
  const [query, setQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsFocused(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const results = useMemo<SearchResult[]>(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 2) return [];
    const items: SearchResult[] = [];
    const seen = new Set<string>();

    for (const trip of trips) {
      // Match trip name
      if (trip.name.toLowerCase().includes(q)) {
        items.push({
          type: 'trip',
          tripId: trip.id,
          title: trip.name,
          subtitle: trip.destination || `${trip.start_date} – ${trip.end_date}`,
          icon: <Plane className="h-4 w-4" />,
        });
      }

      // Match destination
      if (trip.destination && trip.destination.toLowerCase().includes(q) && !seen.has(`dest-${trip.destination}`)) {
        seen.add(`dest-${trip.destination}`);
        items.push({
          type: 'destination',
          tripId: trip.id,
          title: trip.destination,
          subtitle: trip.name,
          icon: <MapPin className="h-4 w-4" />,
        });
      }

      // Match events
      for (const event of trip.events) {
        if (
          event.title.toLowerCase().includes(q) ||
          (event.notes && event.notes.toLowerCase().includes(q))
        ) {
          const config = CATEGORY_DISPLAY_CONFIG[event.category];
          items.push({
            type: 'event',
            tripId: trip.id,
            title: event.title,
            subtitle: `${trip.name} · ${event.date} · ${config?.name || event.category}`,
            icon: <Calendar className="h-4 w-4" />,
          });
        }
      }

      if (items.length >= 10) break;
    }

    return items.slice(0, 10);
  }, [query, trips]);

  const handleSelect = (result: SearchResult) => {
    onSelectTrip?.(result.tripId);
    setQuery('');
    setIsFocused(false);
  };

  const showDropdown = isFocused && query.trim().length >= 2;

  return (
    <header className="h-16 border-b border-border bg-card/80 backdrop-blur-sm flex items-center px-4 sm:px-6 gap-4 sticky top-0 z-30" dir="rtl">
      {/* Right: user + notifications */}
      <div className="flex items-center gap-2">
        <UserProfileMenu onLogout={onLogout} />
        <NotificationBell onSelectTrip={onSelectTrip} />
      </div>

      {/* Center: search */}
      <div className="flex-1 max-w-xl mx-auto hidden sm:block relative" ref={containerRef}>
        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setIsFocused(true)}
            placeholder="חפש יעדים, מלונות או טיסות..."
            className="pr-10 bg-secondary/50 border-0 focus-visible:ring-1 rounded-full h-10"
          />
          {query && (
            <button
              onClick={() => { setQuery(''); }}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Dropdown results */}
        {showDropdown && (
          <div className="absolute top-full mt-2 w-full bg-card border border-border rounded-xl shadow-xl overflow-hidden z-50">
            {results.length === 0 ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                לא נמצאו תוצאות עבור "{query}"
              </div>
            ) : (
              <div className="max-h-80 overflow-y-auto py-1">
                {results.map((result, i) => (
                  <button
                    key={`${result.tripId}-${result.title}-${i}`}
                    onClick={() => handleSelect(result)}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-secondary/60 transition-colors text-right"
                  >
                    <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center shrink-0 text-muted-foreground">
                      {result.icon}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{result.title}</p>
                      <p className="text-xs text-muted-foreground truncate">{result.subtitle}</p>
                    </div>
                    <span className="text-[10px] text-muted-foreground/60 bg-secondary px-2 py-0.5 rounded-full shrink-0">
                      {result.type === 'trip' ? 'טיול' : result.type === 'event' ? 'פעילות' : 'יעד'}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Left: sidebar trigger */}
      <div className="ml-auto">
        <SidebarTrigger />
      </div>
    </header>
  );
};

export default TopBar;

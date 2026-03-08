import React, { useState, useMemo } from 'react';
import { Trip, Event, EventCategory, FlightDetails, AccommodationDetails, TransportDetails, ActivityDetails, ShoppingDetails, GeneralDetails } from '@/types';
import { CATEGORY_DISPLAY_CONFIG, EVENT_CATEGORIES, CURRENCY_SYMBOLS, PRESET_TAGS } from '@/constants';
import { Search, X, Star, Heart, Tag, MapPin, Clock, ChevronDown, ChevronUp, ExternalLink, CreditCard, Navigation, Plane, Building, Car, ShoppingBag } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useLanguage } from '@/contexts/LanguageContext';

interface ActivityArchiveProps {
  trips: Trip[];
  onUpdateTrip: (updatedTrip: Trip) => void;
  onSelectTrip: (tripId: string) => void;
}

type ArchiveEvent = Event & { tripName: string; tripId: string; tripDestination?: string };

const getTagStyle = (tag: string) => {
  const preset = PRESET_TAGS.find(t => t.label === tag);
  if (preset) return preset.color;
  return 'bg-secondary text-muted-foreground border-border';
};

const getTagEmoji = (tag: string) => {
  const preset = PRESET_TAGS.find(t => t.label === tag);
  return preset?.emoji || '🏷️';
};

const getLocationFromDetails = (event: Event): string | null => {
  const d = event.details as any;
  if (!d) return null;
  if (d.location) return d.location;
  if (d.address) return d.address;
  if (d.dept_airport && d.arr_airport) return `${d.dept_airport} → ${d.arr_airport}`;
  if (d.pickup_point && d.dropoff_point) return `${d.pickup_point} → ${d.dropoff_point}`;
  return null;
};

const ActivityArchive: React.FC<ActivityArchiveProps> = ({ trips, onUpdateTrip, onSelectTrip }) => {
  const { t, dir, isRTL } = useLanguage();
  const [search, setSearch] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<EventCategory[]>([]);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const allEvents: ArchiveEvent[] = useMemo(() => {
    return trips.flatMap(trip =>
      trip.events.map(event => ({ ...event, tripName: trip.name, tripId: trip.id, tripDestination: trip.destination }))
    );
  }, [trips]);

  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    allEvents.forEach(e => (e.tags || []).forEach(tg => tagSet.add(tg)));
    return Array.from(tagSet);
  }, [allEvents]);

  const filtered = useMemo(() => {
    return allEvents.filter(event => {
      const matchesSearch = search === '' || event.title.toLowerCase().includes(search.toLowerCase()) || event.tripName.toLowerCase().includes(search.toLowerCase()) || (event.notes && event.notes.toLowerCase().includes(search.toLowerCase()));
      const matchesCategory = selectedCategories.length === 0 || selectedCategories.includes(event.category);
      const matchesFavorite = !showFavoritesOnly || event.is_favorite;
      const matchesTags = selectedTags.length === 0 || selectedTags.every(tg => (event.tags || []).includes(tg));
      return matchesSearch && matchesCategory && matchesFavorite && matchesTags;
    });
  }, [allEvents, search, selectedCategories, showFavoritesOnly, selectedTags]);

  const toggleCategory = (cat: EventCategory) => setSelectedCategories(prev => prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]);
  const toggleTag = (tag: string) => setSelectedTags(prev => prev.includes(tag) ? prev.filter(tg => tg !== tag) : [...prev, tag]);
  const toggleFavorite = (event: ArchiveEvent) => {
    const trip = trips.find(tr => tr.id === event.tripId);
    if (!trip) return;
    onUpdateTrip({ ...trip, events: trip.events.map(e => e.id === event.id ? { ...e, is_favorite: !e.is_favorite } : e) });
  };
  const clearFilters = () => { setSearch(''); setSelectedCategories([]); setShowFavoritesOnly(false); setSelectedTags([]); };

  const hasFilters = search !== '' || selectedCategories.length > 0 || showFavoritesOnly || selectedTags.length > 0;
  const favoriteCount = allEvents.filter(e => e.is_favorite).length;

  return (
    <div className="space-y-6" dir={dir}>
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className={`absolute ${isRTL ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground`} />
          <Input placeholder={t('archive.searchPlaceholder')} value={search} onChange={e => setSearch(e.target.value)} className={isRTL ? 'pr-10' : 'pl-10'} />
        </div>
        <button onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all border ${showFavoritesOnly ? 'bg-red-50 text-red-600 border-red-200 shadow-sm dark:bg-red-900/20 dark:border-red-800' : 'bg-card border-border text-muted-foreground hover:border-primary/30'}`}>
          <Heart className={`h-4 w-4 ${showFavoritesOnly ? 'fill-red-500' : ''}`} />
          {t('archive.favorites')} {favoriteCount > 0 && `(${favoriteCount})`}
        </button>
        {hasFilters && (
          <button onClick={clearFilters} className="btn-ghost flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" /> {t('archive.clearFilters')}
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {EVENT_CATEGORIES.map(cat => {
          const config = CATEGORY_DISPLAY_CONFIG[cat];
          const isActive = selectedCategories.includes(cat as EventCategory);
          return (
            <button key={cat} onClick={() => toggleCategory(cat as EventCategory)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all border ${isActive ? `${config?.bgColor} ${config?.color} ${config?.borderColor} shadow-sm` : 'bg-card border-border text-muted-foreground hover:border-primary/30'}`}>
              {config?.icon} {config?.name}
            </button>
          );
        })}
      </div>

      {allTags.length > 0 && (
        <div className="flex flex-wrap gap-2 items-center">
          <Tag className="h-4 w-4 text-muted-foreground" />
          {allTags.map(tag => {
            const isActive = selectedTags.includes(tag);
            return (
              <button key={tag} onClick={() => toggleTag(tag)}
                className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${isActive ? getTagStyle(tag) + ' shadow-sm ring-1 ring-offset-1' : 'bg-card border-border text-muted-foreground hover:border-primary/30'}`}>
                {getTagEmoji(tag)} {tag}
              </button>
            );
          })}
        </div>
      )}

      <p className="text-sm text-muted-foreground">
        {filtered.length === 1 ? t('archive.oneActivity') : t('archive.activitiesCount', { count: filtered.length })}
        {hasFilters && ` (${t('archive.outOf', { total: allEvents.length })})`}
      </p>

      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-4xl mb-3">{showFavoritesOnly ? '❤️' : '🔍'}</p>
          <p className="text-muted-foreground">{showFavoritesOnly ? t('archive.noFavorites') : t('archive.noMatch')}</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {filtered.map(event => {
            const config = CATEGORY_DISPLAY_CONFIG[event.category];
            const isExpanded = expandedId === `${event.tripId}-${event.id}`;
            const location = getLocationFromDetails(event);
            const details = event.details as any;

            return (
              <div key={`${event.tripId}-${event.id}`}
                className={`rounded-xl border bg-card transition-all ${config?.borderColor} ${isExpanded ? 'shadow-md ring-1 ring-primary/10' : 'hover:shadow-md'}`}>
                <div className="p-4 cursor-pointer" onClick={() => setExpandedId(isExpanded ? null : `${event.tripId}-${event.id}`)}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${config?.bgColor} ${config?.color}`}>{config?.icon} {config?.name}</span>
                        <span className="text-xs text-muted-foreground">{event.date}</span>
                        {event.is_favorite && <Heart className="h-3.5 w-3.5 text-red-500 fill-red-500" />}
                      </div>
                      <h3 className="font-semibold text-foreground truncate">{event.title}</h3>
                      <p className="text-sm text-muted-foreground mt-0.5">🗂️ {event.tripName}</p>
                      {event.tags && event.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {event.tags.map(tag => (
                            <span key={tag} className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-medium border ${getTagStyle(tag)}`}>{getTagEmoji(tag)} {tag}</span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex items-start gap-2 shrink-0">
                      <div className={isRTL ? 'text-left' : 'text-right'}>
                        <span className="font-semibold text-foreground">{CURRENCY_SYMBOLS[event.currency] || ''}{event.amount.toLocaleString()}</span>
                        <p className="text-xs text-muted-foreground">{event.currency}</p>
                      </div>
                      {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground mt-1" /> : <ChevronDown className="h-4 w-4 text-muted-foreground mt-1" />}
                    </div>
                  </div>
                </div>

                {isExpanded && (
                  <div className="px-4 pb-4 border-t border-border pt-3 space-y-3 animate-fade-in">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                      {location && <div className="flex items-center gap-2 text-muted-foreground"><MapPin className="h-4 w-4 shrink-0" /><span>{location}</span></div>}
                      <div className="flex items-center gap-2 text-muted-foreground"><Clock className="h-4 w-4 shrink-0" /><span>{event.time}{event.endTime ? ` - ${event.endTime}` : ''}</span></div>
                      <div className="flex items-center gap-2 text-muted-foreground"><CreditCard className="h-4 w-4 shrink-0" /><span>{event.payment_method}</span></div>
                      {event.tripDestination && <div className="flex items-center gap-2 text-muted-foreground"><Navigation className="h-4 w-4 shrink-0" /><span>{event.tripDestination}</span></div>}
                      {details?.airline && <div className="flex items-center gap-2 text-muted-foreground">✈️ {details.airline}</div>}
                      {details?.flight_num && <div className="flex items-center gap-2 text-muted-foreground">✈️ {t('archive.flight')}: {details.flight_num}</div>}
                      {details?.terminal && <div className="flex items-center gap-2 text-muted-foreground">🏢 Terminal {details.terminal}{details?.gate ? ` · Gate ${details.gate}` : ''}</div>}
                      {details?.room_type && <div className="flex items-center gap-2 text-muted-foreground">🛏️ {details.room_type}</div>}
                      {details?.check_in && <div className="flex items-center gap-2 text-muted-foreground">🔑 Check-in: {details.check_in}{details?.check_out ? ` · Check-out: ${details.check_out}` : ''}</div>}
                      {details?.transport_type && <div className="flex items-center gap-2 text-muted-foreground">🚗 {({ rental: 'Rental Car', train: 'Train', bus: 'Bus', taxi: 'Taxi', ferry: 'Ferry', other: 'Other' } as Record<string, string>)[details.transport_type] || details.transport_type}</div>}
                      {details?.company && <div className="flex items-center gap-2 text-muted-foreground">🏢 {details.company}</div>}
                      {details?.confirmation_num && <div className="flex items-center gap-2 text-muted-foreground">📋 {details.confirmation_num}</div>}
                      {details?.opening_hours && <div className="flex items-center gap-2 text-muted-foreground">🕐 {details.opening_hours}</div>}
                      {details?.customs_note && <div className="flex items-center gap-2 text-muted-foreground">📦 {details.customs_note}</div>}
                      {details?.checkin_link && <a href={details.checkin_link} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-primary hover:underline"><ExternalLink className="h-4 w-4 shrink-0" /> {t('eventDetails.checkin')}</a>}
                      {details?.book_link && <a href={details.book_link} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-primary hover:underline"><ExternalLink className="h-4 w-4 shrink-0" /> {t('archive.bookingLink')}</a>}
                      {details?.website && <a href={details.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-primary hover:underline"><ExternalLink className="h-4 w-4 shrink-0" /> {t('eventDetails.website')}</a>}
                      {details?.phone && <a href={`tel:${details.phone}`} className="flex items-center gap-2 text-muted-foreground hover:text-foreground">📞 {details.phone}</a>}
                    </div>
                    {event.notes && <div className="bg-secondary/50 rounded-lg p-3 text-sm text-foreground">📝 {event.notes}</div>}
                    {event.rating && event.rating > 0 && (
                      <div className="flex items-center gap-0.5">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star key={i} className={`h-4 w-4 ${i < event.rating! ? 'text-accent fill-accent' : 'text-muted-foreground/30'}`} />
                        ))}
                      </div>
                    )}
                    <div className="flex items-center gap-2 pt-1">
                      <button onClick={(e) => { e.stopPropagation(); toggleFavorite(event); }}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${event.is_favorite ? 'bg-red-50 text-red-600 border-red-200 dark:bg-red-900/20 dark:border-red-800' : 'bg-card border-border text-muted-foreground hover:border-red-200 hover:text-red-500'}`}>
                        <Heart className={`h-4 w-4 ${event.is_favorite ? 'fill-red-500' : ''}`} />
                        {event.is_favorite ? t('archive.isFavorite') : t('archive.addFavorite')}
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); onSelectTrip(event.tripId); }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border bg-card border-border text-muted-foreground hover:border-primary/30 hover:text-foreground transition-all">
                        🗂️ {t('archive.goToTrip')}
                      </button>
                      {location && (
                        <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`}
                          target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border bg-card border-border text-muted-foreground hover:border-primary/30 hover:text-foreground transition-all">
                          🗺️ {t('archive.mapLabel')}
                        </a>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ActivityArchive;

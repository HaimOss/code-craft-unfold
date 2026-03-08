import React, { useState, useMemo } from 'react';
import { Trip, Event, EventCategory } from '@/types';
import { CATEGORY_DISPLAY_CONFIG, EVENT_CATEGORIES, CURRENCY_SYMBOLS, PRESET_TAGS } from '@/constants';
import { Search, Filter, X, Star, Heart, Tag } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

interface ActivityArchiveProps {
  trips: Trip[];
}

const getTagStyle = (tag: string) => {
  const preset = PRESET_TAGS.find(t => t.label === tag);
  if (preset) return preset.color;
  return 'bg-secondary text-muted-foreground border-border';
};

const getTagEmoji = (tag: string) => {
  const preset = PRESET_TAGS.find(t => t.label === tag);
  return preset?.emoji || '🏷️';
};

const ActivityArchive: React.FC<ActivityArchiveProps> = ({ trips }) => {
  const [search, setSearch] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<EventCategory[]>([]);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const allEvents = useMemo(() => {
    return trips.flatMap(trip =>
      trip.events.map(event => ({ ...event, tripName: trip.name, tripId: trip.id }))
    );
  }, [trips]);

  // Collect all unique tags across events
  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    allEvents.forEach(e => (e.tags || []).forEach(t => tagSet.add(t)));
    return Array.from(tagSet);
  }, [allEvents]);

  const filtered = useMemo(() => {
    return allEvents.filter(event => {
      const matchesSearch = search === '' ||
        event.title.toLowerCase().includes(search.toLowerCase()) ||
        event.tripName.toLowerCase().includes(search.toLowerCase()) ||
        (event.notes && event.notes.toLowerCase().includes(search.toLowerCase()));
      const matchesCategory = selectedCategories.length === 0 || selectedCategories.includes(event.category);
      const matchesFavorite = !showFavoritesOnly || event.is_favorite;
      const matchesTags = selectedTags.length === 0 || selectedTags.every(t => (event.tags || []).includes(t));
      return matchesSearch && matchesCategory && matchesFavorite && matchesTags;
    });
  }, [allEvents, search, selectedCategories, showFavoritesOnly, selectedTags]);

  const toggleCategory = (cat: EventCategory) => {
    setSelectedCategories(prev =>
      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
    );
  };

  const toggleTag = (tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const clearFilters = () => {
    setSearch('');
    setSelectedCategories([]);
    setShowFavoritesOnly(false);
    setSelectedTags([]);
  };

  const hasFilters = search !== '' || selectedCategories.length > 0 || showFavoritesOnly || selectedTags.length > 0;
  const favoriteCount = allEvents.filter(e => e.is_favorite).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="חפש פעילויות, מסעדות, טיולים..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <button
          onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all border ${
            showFavoritesOnly
              ? 'bg-red-50 text-red-600 border-red-200 shadow-sm'
              : 'bg-card border-border text-muted-foreground hover:border-primary/30'
          }`}
        >
          <Heart className={`h-4 w-4 ${showFavoritesOnly ? 'fill-red-500' : ''}`} />
          מועדפים {favoriteCount > 0 && `(${favoriteCount})`}
        </button>
        {hasFilters && (
          <button onClick={clearFilters} className="btn-ghost flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" /> נקה פילטרים
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {EVENT_CATEGORIES.map(cat => {
          const config = CATEGORY_DISPLAY_CONFIG[cat];
          const isActive = selectedCategories.includes(cat as EventCategory);
          return (
            <button
              key={cat}
              onClick={() => toggleCategory(cat as EventCategory)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all border ${
                isActive
                  ? `${config?.bgColor} ${config?.color} ${config?.borderColor} shadow-sm`
                  : 'bg-card border-border text-muted-foreground hover:border-primary/30'
              }`}
            >
              {config?.icon} {config?.name}
            </button>
          );
        })}
      </div>

      {/* Tag filters */}
      {allTags.length > 0 && (
        <div className="flex flex-wrap gap-2 items-center">
          <Tag className="h-4 w-4 text-muted-foreground" />
          {allTags.map(tag => {
            const isActive = selectedTags.includes(tag);
            return (
              <button
                key={tag}
                onClick={() => toggleTag(tag)}
                className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${
                  isActive ? getTagStyle(tag) + ' shadow-sm ring-1 ring-offset-1' : 'bg-card border-border text-muted-foreground hover:border-primary/30'
                }`}
              >
                {getTagEmoji(tag)} {tag}
              </button>
            );
          })}
        </div>
      )}

      <p className="text-sm text-muted-foreground">
        {filtered.length} {filtered.length === 1 ? 'פעילות' : 'פעילויות'}
        {hasFilters && ` (מתוך ${allEvents.length})`}
      </p>

      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-4xl mb-3">{showFavoritesOnly ? '❤️' : '🔍'}</p>
          <p className="text-muted-foreground">
            {showFavoritesOnly ? 'אין פעילויות מועדפות עדיין' : 'לא נמצאו פעילויות מתאימות'}
          </p>
        </div>
      ) : (
        <div className="grid gap-3">
          {filtered.map(event => {
            const config = CATEGORY_DISPLAY_CONFIG[event.category];
            return (
              <div
                key={`${event.tripId}-${event.id}`}
                className={`rounded-xl border p-4 bg-card hover:shadow-md transition-shadow ${config?.borderColor}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${config?.bgColor} ${config?.color}`}>
                        {config?.icon} {config?.name}
                      </span>
                      <span className="text-xs text-muted-foreground">{event.date}</span>
                      {event.is_favorite && (
                        <Heart className="h-3.5 w-3.5 text-red-500 fill-red-500" />
                      )}
                    </div>
                    <h3 className="font-semibold text-foreground truncate">{event.title}</h3>
                    <p className="text-sm text-muted-foreground mt-0.5">🗂️ {event.tripName}</p>
                    {event.tags && event.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {event.tags.map(tag => (
                          <span key={tag} className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-medium border ${getTagStyle(tag)}`}>
                            {getTagEmoji(tag)} {tag}
                          </span>
                        ))}
                      </div>
                    )}
                    {event.notes && (
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{event.notes}</p>
                    )}
                    {event.rating && (
                      <div className="flex items-center gap-0.5 mt-1">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            className={`h-3.5 w-3.5 ${i < event.rating! ? 'text-accent fill-accent' : 'text-muted-foreground/30'}`}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <span className="font-semibold text-foreground">
                      {CURRENCY_SYMBOLS[event.currency] || ''}{event.amount.toLocaleString()}
                    </span>
                    <p className="text-xs text-muted-foreground">{event.currency}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ActivityArchive;
import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Search, MapPin, DollarSign, Tag, Filter, X } from 'lucide-react';
import { CATEGORY_ICONS, EVENT_CATEGORIES } from '@/constants';

interface SavedActivity {
  id: string;
  title: string;
  category: string;
  location: string | null;
  country: string | null;
  estimated_cost: number | null;
  currency: string | null;
  notes: string | null;
  tags: string[] | null;
  details: Record<string, any> | null;
  source_url: string | null;
}

interface ImportFromBankModalProps {
  open: boolean;
  onClose: () => void;
  onSelect: (activity: SavedActivity) => void;
}

const ImportFromBankModal: React.FC<ImportFromBankModalProps> = ({ open, onClose, onSelect }) => {
  const { t, isRTL } = useLanguage();
  const [activities, setActivities] = useState<SavedActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedLocation, setSelectedLocation] = useState<string>('');

  useEffect(() => {
    if (!open) return;
    setSearch('');
    setSelectedCategory('');
    setSelectedLocation('');
    const load = async () => {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from('saved_activities')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      setActivities((data as SavedActivity[]) || []);
      setLoading(false);
    };
    load();
  }, [open]);

  // Extract unique countries for the filter
  const countries = useMemo(() => {
    const countrySet = new Set<string>();
    activities.forEach(a => {
      if (a.country?.trim()) {
        countrySet.add(a.country.trim());
      }
    });
    return [...countrySet].sort();
  }, [activities]);

  const filtered = useMemo(() => {
    return activities.filter(a => {
      // Text search
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchesSearch = a.title.toLowerCase().includes(q) ||
          a.location?.toLowerCase().includes(q) ||
          a.category.toLowerCase().includes(q);
        if (!matchesSearch) return false;
      }
      // Category filter
      if (selectedCategory && a.category !== selectedCategory) return false;
      // Country filter
      if (selectedLocation && a.country?.trim() !== selectedLocation) return false;
      return true;
    });
  }, [activities, search, selectedCategory, selectedLocation]);

  const hasActiveFilters = selectedCategory || selectedLocation;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{t('eventForm.importFromBank')}</DialogTitle>
        </DialogHeader>

        {/* Search */}
        <div className="relative">
          <Search className={`absolute ${isRTL ? 'right-3' : 'left-3'} top-3 h-4 w-4 text-muted-foreground`} />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={t('eventForm.searchBank')}
            className={`input-field w-full ${isRTL ? 'pr-10' : 'pl-10'}`}
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2">
          {/* Category filter */}
          <select
            value={selectedCategory}
            onChange={e => setSelectedCategory(e.target.value)}
            className="rounded-md border border-input bg-background px-3 py-1.5 text-xs"
          >
            <option value="">{t('eventForm.allCategories')}</option>
            {EVENT_CATEGORIES.map(cat => (
              <option key={cat} value={cat}>{(CATEGORY_ICONS as any)[cat] || '📌'} {cat}</option>
            ))}
          </select>

          {/* Location filter */}
          <select
            value={selectedLocation}
            onChange={e => setSelectedLocation(e.target.value)}
            className="rounded-md border border-input bg-background px-3 py-1.5 text-xs"
          >
            <option value="">{t('eventForm.allCountries')}</option>
            {countries.map(c => (
              <option key={c} value={c}>🌍 {c}</option>
            ))}
          </select>

          {/* Clear filters */}
          {hasActiveFilters && (
            <button
              onClick={() => { setSelectedCategory(''); setSelectedLocation(''); }}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1.5"
            >
              <X className="h-3 w-3" /> {t('eventForm.clearFilters')}
            </button>
          )}
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto space-y-2 min-h-0">
          {loading ? (
            <p className="text-center text-muted-foreground py-8">{t('app.loading')}</p>
          ) : filtered.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">{t('eventForm.noBankActivities')}</p>
          ) : (
            filtered.map(activity => (
              <button
                key={activity.id}
                onClick={() => { onSelect(activity); onClose(); }}
                className="w-full text-start p-3 rounded-lg border border-border hover:border-primary/50 hover:bg-accent/50 transition-all"
              >
                <div className="flex items-center gap-2 mb-1">
                  <span>{(CATEGORY_ICONS as any)[activity.category] || '📌'}</span>
                  <span className="font-medium text-foreground">{activity.title}</span>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                  {activity.location && (
                    <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{activity.location}</span>
                  )}
                  {activity.estimated_cost != null && activity.estimated_cost > 0 && (
                    <span className="flex items-center gap-1"><DollarSign className="h-3 w-3" />{activity.estimated_cost} {activity.currency}</span>
                  )}
                  {activity.tags && activity.tags.length > 0 && (
                    <span className="flex items-center gap-1"><Tag className="h-3 w-3" />{activity.tags.slice(0, 3).join(', ')}</span>
                  )}
                </div>
              </button>
            ))
          )}
        </div>

        <div className="flex justify-end pt-2">
          <Button variant="outline" onClick={onClose}>{t('actions.cancel')}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ImportFromBankModal;

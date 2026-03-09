import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Search, MapPin, DollarSign, Tag } from 'lucide-react';
import { CATEGORY_ICONS } from '@/constants';

interface SavedActivity {
  id: string;
  title: string;
  category: string;
  location: string | null;
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
  const { t } = useLanguage();
  const [activities, setActivities] = useState<SavedActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!open) return;
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

  const filtered = useMemo(() => {
    if (!search.trim()) return activities;
    const q = search.toLowerCase();
    return activities.filter(a =>
      a.title.toLowerCase().includes(q) ||
      a.location?.toLowerCase().includes(q) ||
      a.category.toLowerCase().includes(q)
    );
  }, [activities, search]);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{t('eventForm.importFromBank')}</DialogTitle>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={t('eventForm.searchBank')}
            className="input-field pl-10 w-full"
          />
        </div>

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

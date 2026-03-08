import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { toast } from '@/hooks/use-toast';
import { Trip, EventCategory } from '@/types';
import { CATEGORY_DISPLAY_CONFIG, CURRENCY_SYMBOLS, EVENT_CATEGORIES } from '@/constants';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, Search, Share2, Trash2, CalendarPlus, ExternalLink, MapPin, Tag } from 'lucide-react';
import SaveActivityModal from './SaveActivityModal';
import AssignToTripModal from './AssignToTripModal';
import ShareActivityModal from './ShareActivityModal';

export interface SavedActivity {
  id: string;
  user_id: string;
  title: string;
  category: string;
  location?: string;
  details?: any;
  notes?: string;
  tags?: string[];
  estimated_cost?: number;
  currency?: string;
  source_url?: string;
  is_public?: boolean;
  created_at?: string;
}

interface ActivityBankProps {
  trips: Trip[];
  onUpdateTrip?: (trip: Trip) => void;
}

const ActivityBank: React.FC<ActivityBankProps> = ({ trips, onUpdateTrip }) => {
  const { user } = useAuth();
  const { t, dir } = useLanguage();
  const [activities, setActivities] = useState<SavedActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [editingActivity, setEditingActivity] = useState<SavedActivity | null>(null);
  const [assignActivity, setAssignActivity] = useState<SavedActivity | null>(null);
  const [shareActivity, setShareActivity] = useState<SavedActivity | null>(null);
  const [receivedActivities, setReceivedActivities] = useState<SavedActivity[]>([]);

  const loadActivities = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('saved_activities')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setActivities(data || []);
    } catch (err: any) {
      toast({ title: t('activityBank.loadError'), description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const loadReceivedShares = async () => {
    if (!user?.email) return;
    try {
      const { data: shares, error } = await supabase
        .from('activity_shares')
        .select('*, saved_activities(*)')
        .eq('shared_with_email', user.email)
        .eq('status', 'pending');
      if (error) throw error;
      if (shares && shares.length > 0) {
        const received = shares
          .map((s: any) => s.saved_activities)
          .filter(Boolean) as SavedActivity[];
        setReceivedActivities(received);
      }
    } catch {
      // silently fail
    }
  };

  useEffect(() => { loadActivities(); loadReceivedShares(); }, [user]);

  const filtered = useMemo(() => {
    let list = activities;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(a => a.title.toLowerCase().includes(q) || a.location?.toLowerCase().includes(q));
    }
    if (selectedCategory) {
      list = list.filter(a => a.category === selectedCategory);
    }
    return list;
  }, [activities, search, selectedCategory]);

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from('saved_activities').delete().eq('id', id);
      if (error) throw error;
      setActivities(prev => prev.filter(a => a.id !== id));
      toast({ title: t('activityBank.deleted') });
    } catch (err: any) {
      toast({ title: t('activityBank.deleteError'), description: err.message, variant: 'destructive' });
    }
  };

  const handleSaveActivity = async (activity: Partial<SavedActivity>) => {
    if (!user) return;
    try {
      if (editingActivity) {
        const { error } = await supabase.from('saved_activities').update(activity).eq('id', editingActivity.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('saved_activities').insert({ ...activity, user_id: user.id });
        if (error) throw error;
      }
      setIsSaveModalOpen(false);
      setEditingActivity(null);
      loadActivities();
      toast({ title: editingActivity ? t('activityBank.updated') : t('activityBank.saved') });
    } catch (err: any) {
      toast({ title: t('activityBank.saveError'), description: err.message, variant: 'destructive' });
    }
  };

  const handleAcceptShared = async (activity: SavedActivity) => {
    if (!user) return;
    try {
      const { error } = await supabase.from('saved_activities').insert({
        user_id: user.id,
        title: activity.title,
        category: activity.category,
        location: activity.location,
        details: activity.details,
        notes: activity.notes,
        tags: activity.tags,
        estimated_cost: activity.estimated_cost,
        currency: activity.currency,
        source_url: activity.source_url,
      });
      if (error) throw error;
      // Update share status
      await supabase.from('activity_shares').update({ status: 'accepted' }).eq('activity_id', activity.id).eq('shared_with_email', user.email!);
      setReceivedActivities(prev => prev.filter(a => a.id !== activity.id));
      loadActivities();
      toast({ title: t('activityBank.accepted') });
    } catch (err: any) {
      toast({ title: t('activityBank.saveError'), description: err.message, variant: 'destructive' });
    }
  };

  const getCategoryConfig = (cat: string) => CATEGORY_DISPLAY_CONFIG[cat] || { icon: '📌', name: cat, color: '', bgColor: 'bg-muted', borderColor: '' };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto" dir={dir}>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold font-display">{t('activityBank.title')}</h1>
          <p className="text-muted-foreground text-sm mt-1">{t('activityBank.description')}</p>
        </div>
        <div className="flex gap-2">
          {receivedActivities.length > 0 && (
            <Badge variant="secondary" className="text-sm px-3 py-1.5">
              {t('activityBank.received')} ({receivedActivities.length})
            </Badge>
          )}
          <Button onClick={() => { setEditingActivity(null); setIsSaveModalOpen(true); }}>
            <Plus className="h-4 w-4 me-2" />
            {t('activityBank.add')}
          </Button>
        </div>
      </div>

      {/* Received shares */}
      {receivedActivities.length > 0 && (
        <div className="mb-6 p-4 rounded-xl border border-accent/30 bg-accent/5">
          <h3 className="font-semibold mb-3">{t('activityBank.sharedWithYou')}</h3>
          <div className="space-y-2">
            {receivedActivities.map(a => (
              <div key={a.id} className="flex items-center justify-between p-3 rounded-lg bg-background border">
                <div className="flex items-center gap-2">
                  <span>{getCategoryConfig(a.category).icon}</span>
                  <span className="font-medium">{a.title}</span>
                  {a.location && <span className="text-muted-foreground text-sm">📍 {a.location}</span>}
                </div>
                <Button size="sm" onClick={() => handleAcceptShared(a)}>
                  {t('activityBank.acceptShare')}
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Search & filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={t('activityBank.searchPlaceholder')}
            className="ps-10"
          />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          <Button
            size="sm"
            variant={selectedCategory === null ? 'default' : 'outline'}
            onClick={() => setSelectedCategory(null)}
          >
            {t('activityBank.all')}
          </Button>
          {EVENT_CATEGORIES.map(cat => {
            const cfg = getCategoryConfig(cat);
            return (
              <Button
                key={cat}
                size="sm"
                variant={selectedCategory === cat ? 'default' : 'outline'}
                onClick={() => setSelectedCategory(selectedCategory === cat ? null : cat)}
              >
                {cfg.icon}
              </Button>
            );
          })}
        </div>
      </div>

      {/* Activity list */}
      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-4xl mb-3">🎯</p>
          <p className="text-muted-foreground">{t('activityBank.empty')}</p>
          <Button variant="outline" className="mt-4" onClick={() => { setEditingActivity(null); setIsSaveModalOpen(true); }}>
            <Plus className="h-4 w-4 me-2" />
            {t('activityBank.addFirst')}
          </Button>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map(activity => {
            const cfg = getCategoryConfig(activity.category);
            const symbol = CURRENCY_SYMBOLS[activity.currency || 'ILS'] || activity.currency;
            return (
              <Card key={activity.id} className="group hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{cfg.icon}</span>
                      <h3 className="font-semibold text-sm line-clamp-1">{activity.title}</h3>
                    </div>
                  </div>

                  {activity.location && (
                    <div className="flex items-center gap-1 text-muted-foreground text-xs mb-2">
                      <MapPin className="h-3 w-3" />
                      <span>{activity.location}</span>
                    </div>
                  )}

                  {activity.estimated_cost != null && activity.estimated_cost > 0 && (
                    <p className="text-sm font-medium text-primary mb-2">
                      {symbol}{activity.estimated_cost}
                    </p>
                  )}

                  {activity.tags && activity.tags.length > 0 && (
                    <div className="flex gap-1 flex-wrap mb-2">
                      {activity.tags.map(tag => (
                        <Badge key={tag} variant="secondary" className="text-[10px] px-1.5 py-0">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}

                  {activity.notes && (
                    <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{activity.notes}</p>
                  )}

                  <div className="flex gap-1 pt-2 border-t">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-xs flex-1"
                      onClick={() => setAssignActivity(activity)}
                    >
                      <CalendarPlus className="h-3 w-3 me-1" />
                      {t('activityBank.assignToTrip')}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-xs"
                      onClick={() => setShareActivity(activity)}
                    >
                      <Share2 className="h-3 w-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-xs"
                      onClick={() => { setEditingActivity(activity); setIsSaveModalOpen(true); }}
                    >
                      ✏️
                    </Button>
                    {activity.source_url && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-xs"
                        onClick={() => window.open(activity.source_url!, '_blank')}
                      >
                        <ExternalLink className="h-3 w-3" />
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-xs text-destructive hover:text-destructive"
                      onClick={() => handleDelete(activity.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <SaveActivityModal
        isOpen={isSaveModalOpen}
        onClose={() => { setIsSaveModalOpen(false); setEditingActivity(null); }}
        onSave={handleSaveActivity}
        existingActivity={editingActivity}
      />

      {assignActivity && (
        <AssignToTripModal
          isOpen={!!assignActivity}
          onClose={() => setAssignActivity(null)}
          activity={assignActivity}
          trips={trips}
          onUpdateTrip={onUpdateTrip}
        />
      )}

      {shareActivity && (
        <ShareActivityModal
          isOpen={!!shareActivity}
          onClose={() => setShareActivity(null)}
          activity={shareActivity}
        />
      )}
    </div>
  );
};

export default ActivityBank;

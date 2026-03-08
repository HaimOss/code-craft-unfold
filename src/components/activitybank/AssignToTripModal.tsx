import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { Trip, Event, EventCategory, PaymentMethod } from '@/types';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import type { SavedActivity } from './ActivityBank';

interface AssignToTripModalProps {
  isOpen: boolean;
  onClose: () => void;
  activity: SavedActivity;
  trips: Trip[];
  onUpdateTrip?: (trip: Trip) => void;
}

const AssignToTripModal: React.FC<AssignToTripModalProps> = ({ isOpen, onClose, activity, trips, onUpdateTrip }) => {
  const { t, dir } = useLanguage();
  const { user } = useAuth();
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleAssign = async () => {
    if (!selectedTripId || !user) return;
    setLoading(true);
    try {
      const trip = trips.find(t => t.id === selectedTripId);
      if (!trip) return;

      const newEvent = {
        trip_id: selectedTripId,
        user_id: user.id,
        date: trip.start_date,
        time: '12:00',
        category: activity.category,
        title: activity.title,
        amount: activity.estimated_cost || 0,
        currency: activity.currency || trip.base_currency,
        payment_method: 'Credit',
        details: activity.details || {},
        notes: activity.notes || null,
        tags: activity.tags || [],
        sort_order: trip.events.length,
      };

      const { error } = await supabase.from('events').insert(newEvent);
      if (error) throw error;

      toast({ title: t('activityBank.assigned') });
      onClose();
    } catch (err: any) {
      toast({ title: t('activityBank.assignError'), description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-sm" dir={dir}>
        <DialogHeader>
          <DialogTitle>{t('activityBank.assignToTrip')}</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground mb-4">{t('activityBank.selectTrip')}</p>
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {trips.map(trip => (
            <button
              key={trip.id}
              className={`w-full text-start p-3 rounded-lg border transition-colors ${
                selectedTripId === trip.id
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:bg-muted'
              }`}
              onClick={() => setSelectedTripId(trip.id)}
            >
              <p className="font-medium text-sm">{trip.name}</p>
              <p className="text-xs text-muted-foreground">{trip.destination} • {trip.start_date}</p>
            </button>
          ))}
        </div>
        <div className="flex gap-2 justify-end mt-4">
          <Button variant="outline" onClick={onClose}>{t('activityBank.cancel')}</Button>
          <Button onClick={handleAssign} disabled={!selectedTripId || loading}>
            {t('activityBank.assign')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AssignToTripModal;

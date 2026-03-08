import React, { useState, useEffect } from 'react';
import { Trip, TripStatus } from '@/types';
import { CURRENCY_SYMBOLS } from '@/constants';
import { MapPin, ArrowLeft, ArrowRight } from 'lucide-react';
import { differenceInDays, parseISO } from 'date-fns';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';

interface TripCardProps {
  trip: Trip;
  onSelectTrip: (tripId: string) => void;
}

interface ParticipantInfo {
  id: string;
  name: string;
  avatar_emoji: string;
}

const statusStyles: { [key in TripStatus]: string } = {
  [TripStatus.Idea]: "bg-trip-idea text-primary-foreground",
  [TripStatus.Planning]: "bg-trip-planning/10 text-trip-planning",
  [TripStatus.Booked]: "bg-trip-booked/10 text-trip-booked",
  [TripStatus.Completed]: "bg-muted text-muted-foreground",
};

const TripCard: React.FC<TripCardProps> = ({ trip, onSelectTrip }) => {
  const { t, dir, isRTL } = useLanguage();
  const daysUntil = differenceInDays(parseISO(trip.start_date), new Date());
  const totalCost = trip.events.reduce((s, e) => s + e.amount, 0);
  const symbol = CURRENCY_SYMBOLS[trip.base_currency] || trip.base_currency;
  const tripDays = differenceInDays(parseISO(trip.end_date), parseISO(trip.start_date)) + 1;
  const DetailArrow = isRTL ? ArrowLeft : ArrowRight;

  const [participants, setParticipants] = useState<ParticipantInfo[]>([]);

  useEffect(() => {
    supabase
      .from('trip_participants')
      .select('family_member_id')
      .eq('trip_id', trip.id)
      .then(async ({ data }) => {
        if (!data || data.length === 0) return;
        const ids = data.map(d => d.family_member_id);
        const { data: members } = await supabase
          .from('family_members')
          .select('id, name, avatar_emoji')
          .in('id', ids);
        if (members) setParticipants(members.map(m => ({ id: m.id, name: m.name, avatar_emoji: m.avatar_emoji || '👤' })));
      });
  }, [trip.id]);

  return (
    <div
      onClick={() => onSelectTrip(trip.id)}
      className="group cursor-pointer bg-card rounded-2xl border border-border overflow-hidden hover:shadow-lg hover:-translate-y-1 transition-all duration-300 animate-fade-in"
    >
      <div className="relative h-44 overflow-hidden">
        <img
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          src={trip.cover_image || 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=800&q=80'}
          alt={trip.name}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-foreground/50 to-transparent" />

        {daysUntil > 0 && (
          <span className={`absolute top-3 ${isRTL ? 'right-3' : 'left-3'} bg-card/90 backdrop-blur-sm text-foreground text-xs font-bold px-2.5 py-1 rounded-full`}>
            {t('dashboard.inDays', { count: daysUntil })}
          </span>
        )}
        {daysUntil <= 0 && daysUntil > -tripDays && (
          <span className={`absolute top-3 ${isRTL ? 'right-3' : 'left-3'} bg-accent text-accent-foreground text-xs font-bold px-2.5 py-1 rounded-full`}>
            {t('dashboard.now')}
          </span>
        )}
      </div>

      <div className="p-4" dir={dir}>
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="min-w-0">
            <h3 className="font-bold text-base font-display text-foreground truncate">{trip.name}</h3>
            {trip.destination && (
              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                <MapPin className="h-3 w-3 shrink-0" /> {trip.destination}
              </p>
            )}
          </div>
          {totalCost > 0 && (
            <span className="text-accent font-bold text-sm shrink-0">
              {symbol}{totalCost.toLocaleString()}
            </span>
          )}
        </div>

        {participants.length > 0 && (
          <div className="flex items-center gap-1 mb-2 flex-wrap">
            {participants.slice(0, 5).map(p => (
              <span key={p.id} className="text-sm" title={p.name}>{p.avatar_emoji}</span>
            ))}
            {participants.length > 5 && (
              <span className="text-xs text-muted-foreground">+{participants.length - 5}</span>
            )}
          </div>
        )}

        <div className="flex items-center justify-between mt-3">
          <span className={`status-badge text-[10px] ${statusStyles[trip.status]}`}>
            {trip.status.split(' ')[0]}
          </span>
          <span className="text-primary text-xs font-medium flex items-center gap-1">
            {t('dashboard.tripDetails')} <DetailArrow className="h-3 w-3" />
          </span>
        </div>
      </div>
    </div>
  );
};

export default TripCard;

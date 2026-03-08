import React from 'react';
import { Trip, TripStatus } from '@/types';
import { CURRENCY_SYMBOLS } from '@/constants';
import { MapPin, ArrowLeft } from 'lucide-react';
import { differenceInDays, parseISO } from 'date-fns';

interface TripCardProps {
  trip: Trip;
  onSelectTrip: (tripId: string) => void;
}

const statusStyles: { [key in TripStatus]: string } = {
  [TripStatus.Idea]: "bg-trip-idea text-primary-foreground",
  [TripStatus.Planning]: "bg-trip-planning/10 text-trip-planning",
  [TripStatus.Booked]: "bg-trip-booked/10 text-trip-booked",
  [TripStatus.Completed]: "bg-muted text-muted-foreground",
};

const TripCard: React.FC<TripCardProps> = ({ trip, onSelectTrip }) => {
  const daysUntil = differenceInDays(parseISO(trip.start_date), new Date());
  const totalCost = trip.events.reduce((s, e) => s + e.amount, 0);
  const symbol = CURRENCY_SYMBOLS[trip.base_currency] || trip.base_currency;
  const tripDays = differenceInDays(parseISO(trip.end_date), parseISO(trip.start_date)) + 1;

  return (
    <div
      onClick={() => onSelectTrip(trip.id)}
      className="group cursor-pointer bg-card rounded-2xl border border-border overflow-hidden hover:shadow-lg hover:-translate-y-1 transition-all duration-300 animate-fade-in"
    >
      {/* Image */}
      <div className="relative h-44 overflow-hidden">
        <img
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          src={trip.cover_image || 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=800&q=80'}
          alt={trip.name}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-foreground/50 to-transparent" />

        {daysUntil > 0 && (
          <span className="absolute top-3 right-3 bg-card/90 backdrop-blur-sm text-foreground text-xs font-bold px-2.5 py-1 rounded-full">
            בעוד {daysUntil} ימים
          </span>
        )}
        {daysUntil <= 0 && daysUntil > -tripDays && (
          <span className="absolute top-3 right-3 bg-accent text-accent-foreground text-xs font-bold px-2.5 py-1 rounded-full">
            עכשיו!
          </span>
        )}
      </div>

      {/* Content */}
      <div className="p-4" dir="rtl">
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

        <div className="flex items-center justify-between mt-3">
          <span className={`status-badge text-[10px] ${statusStyles[trip.status]}`}>
            {trip.status.split(' ')[0]}
          </span>
          <span className="text-primary text-xs font-medium flex items-center gap-1">
            פרטי הטיול <ArrowLeft className="h-3 w-3" />
          </span>
        </div>
      </div>
    </div>
  );
};

export default TripCard;

import React from 'react';
import { Trip, TripStatus } from '@/types';
import { CURRENCY_SYMBOLS } from '@/constants';

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
  const getDuration = () => {
    const start = new Date(trip.start_date);
    const end = new Date(trip.end_date);
    const diffDays = Math.ceil(Math.abs(end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    return `${diffDays} Days`;
  };

  return (
    <div
      onClick={() => onSelectTrip(trip.id)}
      className="card-surface overflow-hidden cursor-pointer transform hover:-translate-y-1 hover:shadow-lg transition-all duration-300 animate-fade-in group"
    >
      <div className="relative h-44 overflow-hidden">
        <img
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          src={trip.cover_image || `https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=800&q=80`}
          alt={`Cover for ${trip.name}`}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-foreground/60 to-transparent" />
        <div className="absolute bottom-3 left-3 right-3">
          <h3 className="text-lg font-bold text-primary-foreground drop-shadow-lg font-display">{trip.name}</h3>
          {trip.destination && (
            <p className="text-xs text-primary-foreground/80 mt-0.5 flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
              {trip.destination}
            </p>
          )}
        </div>
      </div>
      <div className="p-4">
        <div className="flex justify-between items-center">
          <span className={`status-badge ${statusStyles[trip.status]}`}>
            {trip.status.split(' ')[0]}
          </span>
          <span className="text-xs text-muted-foreground">{getDuration()}</span>
        </div>
        <div className="mt-3 flex justify-between items-center text-sm text-muted-foreground">
          <span>{trip.start_date} → {trip.end_date}</span>
          <span className="font-medium">{trip.events.length} Events</span>
        </div>
      </div>
    </div>
  );
};

export default TripCard;

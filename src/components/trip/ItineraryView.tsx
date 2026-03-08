import React, { useMemo } from 'react';
import { Trip, Event } from '@/types';
import DayItinerary from './DayItinerary';

interface ItineraryViewProps {
  trip: Trip;
  onAddEvent: (event: Event) => void;
  onUpdateEvent: (event: Event) => void;
  onDeleteEvent: (eventId: string) => void;
  onUpdateTrip: (updatedTrip: Trip) => void;
}

const ItineraryView: React.FC<ItineraryViewProps> = ({ trip, onAddEvent, onUpdateEvent, onDeleteEvent, onUpdateTrip }) => {
  const tripDays = useMemo(() => {
    if (!trip.start_date || !trip.end_date) return [];
    const days: Date[] = [];
    try {
      const start = new Date(trip.start_date + 'T00:00:00');
      const end = new Date(trip.end_date + 'T00:00:00');
      if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) return [];
      let current = new Date(start);
      while (current <= end) {
        days.push(new Date(current));
        current.setDate(current.getDate() + 1);
      }
    } catch { return []; }
    return days;
  }, [trip.start_date, trip.end_date]);

  if (tripDays.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4 text-center card-surface border-dashed">
        <p className="text-4xl mb-4">📅</p>
        <h3 className="text-xl font-bold font-display mb-2">No Itinerary Yet</h3>
        <p className="text-muted-foreground">Set valid start and end dates to create your itinerary.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {tripDays.map((day, index) => {
        const dateStr = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`;
        const dailyEvents = trip.events
          .filter(e => e.date === dateStr)
          .sort((a, b) => a.time.localeCompare(b.time));
        return (
          <DayItinerary
            key={dateStr}
            trip={trip}
            date={dateStr}
            dayNumber={index + 1}
            dailyEvents={dailyEvents}
            onAddEvent={onAddEvent}
            onUpdateEvent={onUpdateEvent}
            onDeleteEvent={onDeleteEvent}
            onUpdateTrip={onUpdateTrip}
          />
        );
      })}
    </div>
  );
};

export default ItineraryView;

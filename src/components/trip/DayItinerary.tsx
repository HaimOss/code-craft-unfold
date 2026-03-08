import React, { useState, useMemo } from 'react';
import { Trip, Event } from '@/types';
import AddEventForm from './AddEventForm';
import EventCard from './EventCard';
import ShareModal from '../modals/ShareModal';
import { normalizeCost } from '@/services/currencyService';
import { getLocationFromEvent } from '@/utils/helpers';
import { CURRENCY_SYMBOLS } from '@/constants';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Plus, ExternalLink, ChevronDown, ChevronUp } from 'lucide-react';

interface DayItineraryProps {
  trip: Trip;
  date: string;
  dayNumber: number;
  dailyEvents: Event[];
  onAddEvent: (event: Event) => void;
  onUpdateEvent: (event: Event) => void;
  onDeleteEvent: (eventId: string) => void;
  onUpdateTrip: (updatedTrip: Trip) => void;
}

const DayItinerary: React.FC<DayItineraryProps> = ({
  trip, date, dayNumber, dailyEvents, onAddEvent, onUpdateEvent, onDeleteEvent, onUpdateTrip,
}) => {
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [isAddingEvent, setIsAddingEvent] = useState(false);
  const [sharingEvent, setSharingEvent] = useState<Event | null>(null);
  const [dayTotal, setDayTotal] = useState(0);
  const [isCollapsed, setIsCollapsed] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  React.useEffect(() => {
    const calc = async () => {
      const costs = await Promise.all(dailyEvents.map(e => normalizeCost(e.amount, e.currency, trip.base_currency, e.date)));
      setDayTotal(costs.reduce((sum, c) => sum + c, 0));
    };
    calc();
  }, [dailyEvents, trip.base_currency]);

  const handleEditEvent = (event: Event) => { setEditingEvent(event); setIsAddingEvent(true); };
  const handleFormCancel = () => { setEditingEvent(null); setIsAddingEvent(false); };
  const handleFormSubmit = (event: Event) => {
    if (editingEvent) onUpdateEvent(event);
    else onAddEvent({ ...event, date });
    setIsAddingEvent(false); setEditingEvent(null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = dailyEvents.findIndex(e => e.id === active.id);
      const newIndex = dailyEvents.findIndex(e => e.id === over.id);
      const reordered = arrayMove(dailyEvents, oldIndex, newIndex);
      const otherEvents = trip.events.filter(e => e.date !== date);
      onUpdateTrip({ ...trip, events: [...otherEvents, ...reordered] });
    }
  };

  const getGoogleMapsUrl = () => {
    const locations = dailyEvents.map(getLocationFromEvent).filter((loc): loc is string => !!loc);
    if (locations.length === 0) {
      if (trip.destination) return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(trip.destination)}`;
      return null;
    }
    if (locations.length === 1) {
      return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(locations[0])}`;
    }
    const origin = locations[0];
    const destination = locations[locations.length - 1];
    const waypoints = locations.slice(1, -1);
    return `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}${waypoints.length > 0 ? `&waypoints=${encodeURIComponent(waypoints.join('|'))}` : ''}`;
  };

  const mapsUrl = getGoogleMapsUrl();

  const localDate = useMemo(() => new Date(date + 'T00:00:00'), [date]);

  if (isAddingEvent) {
    return (
      <div className="card-surface p-6">
        <AddEventForm trip={trip} onAddEvent={handleFormSubmit} onUpdateEvent={handleFormSubmit} onCancel={handleFormCancel} existingEvent={editingEvent} initialDate={date} />
      </div>
    );
  }

  return (
    <div className="card-surface p-6 animate-fade-in">
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center">
          <div className="bg-secondary rounded-xl p-3 text-center mr-4 min-w-[60px]">
            <span className="text-[10px] uppercase text-muted-foreground font-semibold">{localDate.toLocaleDateString(undefined, { month: 'short' })}</span>
            <span className="text-2xl font-bold block text-card-foreground">{localDate.getDate()}</span>
          </div>
          <div>
            <h3 className="text-xl font-bold font-display">Day {dayNumber}</h3>
            <div className="flex items-center gap-3 mt-1">
              {mapsUrl ? (
                <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="text-xs flex items-center text-muted-foreground hover:text-primary font-medium transition-colors">
                  <ExternalLink className="h-3 w-3 mr-1" /> Google Maps
                </a>
              ) : (
                <span className="text-xs flex items-center text-muted-foreground/50">
                  <ExternalLink className="h-3 w-3 mr-1" /> Google Maps
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="text-right flex items-center gap-2">
          <div>
            <span className="text-xs text-muted-foreground block">Day Total</span>
            <p className="font-bold text-lg text-card-foreground">
              {dayTotal.toLocaleString(undefined, { style: 'currency', currency: trip.base_currency, minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </p>
          </div>
          <button onClick={() => setIsCollapsed(!isCollapsed)} className="btn-ghost p-1">
            {isCollapsed ? <ChevronDown className="h-5 w-5" /> : <ChevronUp className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {!isCollapsed && (
        <>
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={dailyEvents.map(e => e.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-2">
                {dailyEvents.map(event => (
                  <EventCard key={event.id} event={event} onEdit={() => handleEditEvent(event)} onDelete={() => onDeleteEvent(event.id)} onShare={() => setSharingEvent(event)} />
                ))}
              </div>
            </SortableContext>
          </DndContext>

          <button onClick={() => { setEditingEvent(null); setIsAddingEvent(true); }} className="mt-4 w-full p-3 border-2 border-dashed border-border rounded-xl text-muted-foreground hover:text-primary hover:border-primary transition-all flex items-center justify-center gap-2 text-sm font-medium">
            <Plus className="h-4 w-4" /> Add Event
          </button>
        </>
      )}

      {sharingEvent && (
        <ShareModal
          isOpen={!!sharingEvent}
          onClose={() => setSharingEvent(null)}
          shareUrl={`${window.location.origin}${window.location.pathname}#share/event/${sharingEvent.id}`}
          title={`Share "${sharingEvent.title}"`}
        />
      )}
    </div>
  );
};

export default DayItinerary;

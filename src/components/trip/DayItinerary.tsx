import React, { useState, useMemo, useCallback } from 'react';
import { Trip, Event, DailyInfo } from '@/types';
import jsPDF from 'jspdf';
import AddEventForm from './AddEventForm';
import EventCard from './EventCard';
import ShareModal from '../modals/ShareModal';
import { normalizeCost } from '@/services/currencyService';
import { getLocationFromEvent } from '@/utils/helpers';
import { CURRENCY_SYMBOLS, CATEGORY_DISPLAY_CONFIG } from '@/constants';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Plus, ExternalLink, ChevronDown, ChevronUp, MapPin, Download, Map } from 'lucide-react';
import { Input } from '@/components/ui/input';

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
  const [editingStartPoint, setEditingStartPoint] = useState(false);
  const [editingEndPoint, setEditingEndPoint] = useState(false);

  const dailyInfo = trip.dailyInfo?.[date] || {};

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

  const updateDailyInfo = (field: keyof DailyInfo, value: string) => {
    const updatedDailyInfo = {
      ...trip.dailyInfo,
      [date]: { ...dailyInfo, [field]: value },
    };
    onUpdateTrip({ ...trip, dailyInfo: updatedDailyInfo });
  };

  const getGoogleMapsUrl = () => {
    const locations: string[] = [];
    if (dailyInfo.startPoint) locations.push(dailyInfo.startPoint);
    dailyEvents.forEach(e => {
      const loc = getLocationFromEvent(e);
      if (loc) locations.push(loc);
    });
    if (dailyInfo.endPoint) locations.push(dailyInfo.endPoint);

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

  const getShowMapUrl = () => {
    const locations: string[] = [];
    if (dailyInfo.startPoint) locations.push(dailyInfo.startPoint);
    dailyEvents.forEach(e => {
      const loc = getLocationFromEvent(e);
      if (loc) locations.push(loc);
    });
    if (dailyInfo.endPoint) locations.push(dailyInfo.endPoint);

    if (locations.length === 0 && trip.destination) {
      return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(trip.destination)}`;
    }
    if (locations.length > 0) {
      return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(locations[0])}`;
    }
    return null;
  };

  const handleExportDay = () => {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageW = doc.internal.pageSize.getWidth();
    const margin = 15;
    const contentW = pageW - margin * 2;
    let y = margin;

    const addPage = () => { doc.addPage(); y = margin; };
    const checkPage = (needed: number) => { if (y + needed > 280) addPage(); };

    // Header bar
    doc.setFillColor(55, 90, 180);
    doc.rect(0, 0, pageW, 38, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text(trip.name, margin, 16);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text(`Day ${dayNumber}  |  ${date}  |  ${trip.destination || ''}`, margin, 26);
    const totalStr = dayTotal.toLocaleString(undefined, { style: 'currency', currency: trip.base_currency, minimumFractionDigits: 0, maximumFractionDigits: 0 });
    doc.text(`Total: ${totalStr}`, pageW - margin - doc.getTextWidth(`Total: ${totalStr}`), 26);
    y = 46;

    // Start point
    if (dailyInfo.startPoint) {
      doc.setTextColor(34, 139, 34);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text(`START: ${dailyInfo.startPoint}`, margin, y);
      y += 8;
    }

    // Events
    dailyEvents.forEach((event, idx) => {
      checkPage(35);
      const config = CATEGORY_DISPLAY_CONFIG[event.category];

      // Event card background
      doc.setFillColor(248, 248, 252);
      doc.setDrawColor(220, 220, 230);
      doc.roundedRect(margin, y, contentW, 28, 3, 3, 'FD');

      // Time
      doc.setTextColor(100, 100, 120);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text(event.time, margin + 4, y + 7);

      // Category
      doc.setTextColor(55, 90, 180);
      doc.setFontSize(8);
      doc.text(config?.name || event.category, margin + 20, y + 7);

      // Title
      doc.setTextColor(30, 30, 50);
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text(event.title, margin + 4, y + 15, { maxWidth: contentW - 50 });

      // Amount
      const amountStr = `${CURRENCY_SYMBOLS[event.currency] || ''}${event.amount.toLocaleString()}`;
      doc.setTextColor(230, 120, 50);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text(amountStr, pageW - margin - 4 - doc.getTextWidth(amountStr), y + 15);

      // Location / notes line
      const loc = getLocationFromEvent(event);
      let detailLine = '';
      if (loc) detailLine += loc;
      if (event.notes) detailLine += (detailLine ? '  |  ' : '') + event.notes;
      if (detailLine) {
        doc.setTextColor(120, 120, 140);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.text(detailLine, margin + 4, y + 23, { maxWidth: contentW - 10 });
      }

      // Rating
      if (event.rating) {
        doc.setTextColor(255, 180, 0);
        doc.setFontSize(8);
        const stars = '★'.repeat(event.rating) + '☆'.repeat(5 - event.rating);
        doc.text(stars, pageW - margin - 4 - doc.getTextWidth(stars), y + 23);
      }

      y += 32;
    });

    // End point
    if (dailyInfo.endPoint) {
      checkPage(10);
      doc.setTextColor(200, 50, 50);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text(`END: ${dailyInfo.endPoint}`, margin, y);
      y += 8;
    }

    // Footer
    checkPage(15);
    y += 5;
    doc.setDrawColor(200, 200, 210);
    doc.line(margin, y, pageW - margin, y);
    y += 7;
    doc.setTextColor(100, 100, 120);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`Generated by WonderJourney`, margin, y);
    doc.text(new Date().toLocaleDateString(), pageW - margin - doc.getTextWidth(new Date().toLocaleDateString()), y);

    doc.save(`${trip.name}_Day${dayNumber}_${date}.pdf`);
  };

  const mapsUrl = getGoogleMapsUrl();
  const showMapUrl = getShowMapUrl();
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
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center">
          <div className="bg-secondary rounded-xl p-3 text-center mr-4 min-w-[60px]">
            <span className="text-[10px] uppercase text-muted-foreground font-semibold">{localDate.toLocaleDateString(undefined, { month: 'short' })}</span>
            <span className="text-2xl font-bold block text-card-foreground">{localDate.getDate()}</span>
          </div>
          <div>
            <h3 className="text-xl font-bold font-display">Day {dayNumber}</h3>
            <div className="flex items-center gap-3 mt-1 flex-wrap">
              {showMapUrl ? (
                <a href={showMapUrl} target="_blank" rel="noopener noreferrer" className="text-xs flex items-center text-muted-foreground hover:text-primary font-medium transition-colors">
                  <Map className="h-3 w-3 mr-1" /> Show Map
                </a>
              ) : (
                <span className="text-xs flex items-center text-muted-foreground/50">
                  <Map className="h-3 w-3 mr-1" /> Show Map
                </span>
              )}
              {mapsUrl ? (
                <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="text-xs flex items-center text-muted-foreground hover:text-primary font-medium transition-colors">
                  <ExternalLink className="h-3 w-3 mr-1" /> Google Maps
                </a>
              ) : (
                <span className="text-xs flex items-center text-muted-foreground/50">
                  <ExternalLink className="h-3 w-3 mr-1" /> Google Maps
                </span>
              )}
              <button onClick={handleExportDay} className="text-xs flex items-center text-muted-foreground hover:text-primary font-medium transition-colors">
                <Download className="h-3 w-3 mr-1" /> Export Day
              </button>
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
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-[11px] top-0 bottom-0 w-0.5 bg-border" />

          {/* Starting Point */}
          <div className="relative flex items-center gap-3 mb-4 pl-0">
            <div className="relative z-10 w-6 h-6 rounded-full bg-green-500 flex items-center justify-center shrink-0">
              <div className="w-2 h-2 bg-card rounded-full" />
            </div>
            {editingStartPoint ? (
              <Input
                autoFocus
                placeholder="Enter starting point..."
                defaultValue={dailyInfo.startPoint || ''}
                onBlur={(e) => { updateDailyInfo('startPoint', e.target.value); setEditingStartPoint(false); }}
                onKeyDown={(e) => { if (e.key === 'Enter') { updateDailyInfo('startPoint', (e.target as HTMLInputElement).value); setEditingStartPoint(false); } }}
                className="h-9 text-sm"
              />
            ) : (
              <button
                onClick={() => setEditingStartPoint(true)}
                className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors border border-dashed border-border rounded-lg px-3 py-1.5 hover:border-primary/40"
              >
                <MapPin className="h-3.5 w-3.5" />
                {dailyInfo.startPoint || 'Set Starting Point'}
              </button>
            )}
          </div>

          {/* Events */}
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={dailyEvents.map(e => e.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-2 pl-8">
                {dailyEvents.map(event => (
                  <EventCard
                    key={event.id}
                    event={event}
                    onEdit={() => handleEditEvent(event)}
                    onDelete={() => onDeleteEvent(event.id)}
                    onShare={() => setSharingEvent(event)}
                    onToggleFavorite={() => {
                      const updated = { ...event, is_favorite: !event.is_favorite };
                      onUpdateEvent(updated);
                    }}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>

          {/* Add Event button */}
          <div className="pl-8">
            <button onClick={() => { setEditingEvent(null); setIsAddingEvent(true); }} className="mt-4 w-full p-3 border-2 border-dashed border-border rounded-xl text-muted-foreground hover:text-primary hover:border-primary transition-all flex items-center justify-center gap-2 text-sm font-medium">
              <Plus className="h-4 w-4" /> Add Activity
            </button>
          </div>

          {/* Ending Point */}
          <div className="relative flex items-center gap-3 mt-4 pl-0">
            <div className="relative z-10 w-6 h-6 rounded-full bg-destructive flex items-center justify-center shrink-0">
              <div className="w-2 h-2 bg-card rounded-full" />
            </div>
            {editingEndPoint ? (
              <Input
                autoFocus
                placeholder="Enter ending point..."
                defaultValue={dailyInfo.endPoint || ''}
                onBlur={(e) => { updateDailyInfo('endPoint', e.target.value); setEditingEndPoint(false); }}
                onKeyDown={(e) => { if (e.key === 'Enter') { updateDailyInfo('endPoint', (e.target as HTMLInputElement).value); setEditingEndPoint(false); } }}
                className="h-9 text-sm"
              />
            ) : (
              <button
                onClick={() => setEditingEndPoint(true)}
                className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors border border-dashed border-border rounded-lg px-3 py-1.5 hover:border-primary/40"
              >
                <MapPin className="h-3.5 w-3.5" />
                {dailyInfo.endPoint || 'Set Ending Point'}
              </button>
            )}
          </div>
        </div>
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

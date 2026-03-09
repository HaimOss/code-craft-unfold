import React, { useState, useMemo, useCallback, Suspense, lazy } from 'react';
import { Trip, Event, DailyInfo } from '@/types';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
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
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const DayMap = lazy(() => import('./DayMap'));

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
  const { t, dir, isRTL, language } = useLanguage();
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [isAddingEvent, setIsAddingEvent] = useState(false);
  const [sharingEvent, setSharingEvent] = useState<Event | null>(null);
  const [dayTotal, setDayTotal] = useState(0);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showDayMap, setShowDayMap] = useState(false);
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

  const handleExportDay = async () => {
    const totalStr = dayTotal.toLocaleString(undefined, { style: 'currency', currency: trip.base_currency, minimumFractionDigits: 0, maximumFractionDigits: 0 });

    let eventsHtml = '';
    dailyEvents.forEach((event) => {
      const config = CATEGORY_DISPLAY_CONFIG[event.category];
      const amountStr = `${CURRENCY_SYMBOLS[event.currency] || ''}${event.amount.toLocaleString()}`;
      const loc = getLocationFromEvent(event);
      let detailLine = '';
      if (loc) detailLine += loc;
      if (event.notes) detailLine += (detailLine ? '  |  ' : '') + event.notes;

      eventsHtml += `
        <div style="background:#f8f8fc;border:1px solid #dcdce6;border-radius:6px;padding:10px 12px;margin-bottom:10px;">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
            <div>
              <span style="color:#64647a;font-size:11px;font-weight:bold;margin-left:10px;">${event.time}</span>
              <span style="color:#375ab4;font-size:10px;">${config?.name || event.category}</span>
            </div>
          </div>
          <div style="display:flex;justify-content:space-between;align-items:center;">
            <span style="color:#1e1e32;font-size:16px;font-weight:bold;">${event.title}</span>
            <span style="color:#e67832;font-size:14px;font-weight:bold;">${amountStr}</span>
          </div>
          ${detailLine ? `<div style="color:#78788c;font-size:10px;margin-top:4px;">${detailLine}</div>` : ''}
          ${event.rating ? `<div style="color:#ffb400;font-size:10px;margin-top:3px;">${'★'.repeat(event.rating)}${'☆'.repeat(5 - event.rating)}</div>` : ''}
        </div>
      `;
    });

    const html = `
      <div style="font-family:'Segoe UI',Tahoma,Arial,sans-serif;direction:${dir};width:700px;padding:0;background:white;">
        <div style="background:#375ab4;color:white;padding:16px 20px;">
          <div style="font-size:24px;font-weight:bold;margin-bottom:6px;">${trip.name}</div>
          <div style="display:flex;justify-content:space-between;font-size:13px;">
            <span>${t('trip.day')} ${dayNumber}  |  ${date}  |  ${trip.destination || ''}</span>
            <span>${t('trip.totalToPay')}: ${totalStr}</span>
          </div>
        </div>
        <div style="padding:16px 20px;">
          ${dailyInfo.startPoint ? `<div style="color:#228b22;font-size:12px;font-weight:bold;margin-bottom:10px;">📍 ${dailyInfo.startPoint}</div>` : ''}
          ${eventsHtml}
          ${dailyInfo.endPoint ? `<div style="color:#c83232;font-size:12px;font-weight:bold;margin-top:10px;">🏁 ${dailyInfo.endPoint}</div>` : ''}
        </div>
        <div style="padding:0 20px 16px;">
          <hr style="border:none;border-top:1px solid #c8c8d2;margin:10px 0;"/>
          <div style="display:flex;justify-content:space-between;color:#64647a;font-size:10px;">
            <span>Generated by WonderJourney</span>
            <span>${new Date().toLocaleDateString()}</span>
          </div>
        </div>
      </div>
    `;

    const container = document.createElement('div');
    container.style.position = 'fixed';
    container.style.left = '-10000px';
    container.style.top = '0';
    container.style.width = '700px';
    container.style.background = 'white';
    container.innerHTML = html;
    document.body.appendChild(container);

    try {
      const canvas = await html2canvas(container, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
      const imgData = canvas.toDataURL('image/png');
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageW = doc.internal.pageSize.getWidth();
      const pageH = doc.internal.pageSize.getHeight();
      const imgW = pageW;
      const imgH = (canvas.height * imgW) / canvas.width;

      if (imgH <= pageH) {
        doc.addImage(imgData, 'PNG', 0, 0, imgW, imgH);
      } else {
        let remainingH = imgH;
        let srcY = 0;
        let page = 0;
        while (remainingH > 0) {
          if (page > 0) doc.addPage();
          const sliceH = Math.min(pageH, remainingH);
          doc.addImage(imgData, 'PNG', 0, -srcY, imgW, imgH);
          srcY += pageH;
          remainingH -= pageH;
          page++;
        }
      }

      doc.save(`${trip.name}_Day${dayNumber}_${date}.pdf`);
    } finally {
      document.body.removeChild(container);
    }
  };

  const mapsUrl = getGoogleMapsUrl();
  const localDate = useMemo(() => new Date(date + 'T00:00:00'), [date]);
  const dateLocale = language === 'he' ? 'he-IL' : 'en-US';

  if (isAddingEvent) {
    return (
      <div className="card-surface p-6">
        <AddEventForm trip={trip} onAddEvent={handleFormSubmit} onUpdateEvent={handleFormSubmit} onCancel={handleFormCancel} existingEvent={editingEvent} initialDate={date} />
      </div>
    );
  }

  return (
    <div className="card-surface p-6 animate-fade-in" dir={dir}>
      {/* Header */}
      <div className="flex justify-between items-start sm:items-center mb-4 gap-2">
        <div className="flex items-center min-w-0">
          <div className={`bg-secondary rounded-xl p-2 sm:p-3 text-center ${isRTL ? 'ml-2 sm:ml-4' : 'mr-2 sm:mr-4'} min-w-[48px] sm:min-w-[60px]`}>
            <span className="text-[9px] sm:text-[10px] uppercase text-muted-foreground font-semibold">{localDate.toLocaleDateString(dateLocale, { month: 'short' })}</span>
            <span className="text-xl sm:text-2xl font-bold block text-card-foreground">{localDate.getDate()}</span>
          </div>
          <div className="min-w-0">
            <h3 className="text-lg sm:text-xl font-bold font-display">{t('trip.day')} {dayNumber}</h3>
            <div className="flex items-center gap-2 sm:gap-3 mt-1 flex-wrap">
              <button
                onClick={() => setShowDayMap(!showDayMap)}
                className={`text-[10px] sm:text-xs flex items-center font-medium transition-colors ${
                  showDayMap ? 'text-primary bg-primary/10 px-2 py-0.5 rounded-full' : 'text-muted-foreground hover:text-primary'
                }`}
              >
                <Map className={`h-3 w-3 ${isRTL ? 'ml-1' : 'mr-1'}`} /> {t('trip.mapBtn')}
              </button>
              {mapsUrl ? (
                <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="text-[10px] sm:text-xs flex items-center text-muted-foreground hover:text-primary font-medium transition-colors">
                  <ExternalLink className={`h-3 w-3 ${isRTL ? 'ml-1' : 'mr-1'}`} /> Google Maps
                </a>
              ) : (
                <span className="text-[10px] sm:text-xs flex items-center text-muted-foreground/50">
                  <ExternalLink className={`h-3 w-3 ${isRTL ? 'ml-1' : 'mr-1'}`} /> Google Maps
                </span>
              )}
              <button onClick={handleExportDay} className="text-[10px] sm:text-xs flex items-center text-muted-foreground hover:text-primary font-medium transition-colors">
                <Download className={`h-3 w-3 ${isRTL ? 'ml-1' : 'mr-1'}`} /> <span className="hidden sm:inline">{t('trip.exportDay')}</span><span className="sm:hidden">{t('trip.pdf')}</span>
              </button>
            </div>
          </div>
        </div>
        <div className={`${isRTL ? 'text-left' : 'text-right'} flex items-center gap-1 sm:gap-2 flex-shrink-0`}>
          <div>
            <span className="text-[10px] sm:text-xs text-muted-foreground block">{t('trip.dailyTotal')}</span>
            <p className="font-bold text-base sm:text-lg text-card-foreground">
              {dayTotal.toLocaleString(undefined, { style: 'currency', currency: trip.base_currency, minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </p>
          </div>
          <button onClick={() => setIsCollapsed(!isCollapsed)} className="btn-ghost p-1">
            {isCollapsed ? <ChevronDown className="h-5 w-5" /> : <ChevronUp className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {showDayMap && (
        <Suspense fallback={<div className="flex justify-center py-6 text-muted-foreground text-sm">{t('trip.loadingMap')}</div>}>
          <DayMap events={dailyEvents} dailyInfo={dailyInfo} destination={trip.destination} />
        </Suspense>
      )}

      {!isCollapsed && (
        <div className="relative">
          <div className={`absolute ${isRTL ? 'right-[11px]' : 'left-[11px]'} top-0 bottom-0 w-0.5 bg-border`} />

          {/* Starting Point */}
          <div className={`relative flex items-center gap-3 mb-4 ${isRTL ? 'pr-0' : 'pl-0'}`}>
            <div className="relative z-10 w-6 h-6 rounded-full bg-green-500 flex items-center justify-center shrink-0">
              <div className="w-2 h-2 bg-card rounded-full" />
            </div>
            {editingStartPoint ? (
              <Input
                autoFocus
                placeholder={t('trip.startPointPlaceholder')}
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
                {dailyInfo.startPoint || t('trip.setStartPoint')}
              </button>
            )}
          </div>

          {/* Events */}
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={dailyEvents.map(e => e.id)} strategy={verticalListSortingStrategy}>
              <div className={`space-y-2 ${isRTL ? 'pr-8' : 'pl-8'}`}>
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
                    onSaveToBank={async () => {
                      const { data: { user } } = await supabase.auth.getUser();
                      if (!user) return;
                      const location = getLocationFromEvent(event);
                      const { error } = await supabase.from('saved_activities').insert({
                        user_id: user.id,
                        title: event.title,
                        category: event.category,
                        location: location || null,
                        estimated_cost: event.amount || null,
                        currency: event.currency,
                        notes: event.notes || null,
                        tags: event.tags || [],
                        details: event.details as any,
                      });
                      if (error) {
                        toast.error(error.message);
                      } else {
                        toast.success(t('actions.savedToBank'));
                      }
                    }}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>

          {/* Add Event button */}
          <div className={isRTL ? 'pr-8' : 'pl-8'}>
            <button onClick={() => { setEditingEvent(null); setIsAddingEvent(true); }} className="mt-4 w-full p-3 border-2 border-dashed border-border rounded-xl text-muted-foreground hover:text-primary hover:border-primary transition-all flex items-center justify-center gap-2 text-sm font-medium">
              <Plus className="h-4 w-4" /> {t('trip.addActivity')}
            </button>
          </div>

          {/* Ending Point */}
          <div className={`relative flex items-center gap-3 mt-4 ${isRTL ? 'pr-0' : 'pl-0'}`}>
            <div className="relative z-10 w-6 h-6 rounded-full bg-destructive flex items-center justify-center shrink-0">
              <div className="w-2 h-2 bg-card rounded-full" />
            </div>
            {editingEndPoint ? (
              <Input
                autoFocus
                placeholder={t('trip.endPointPlaceholder')}
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
                {dailyInfo.endPoint || t('trip.setEndPoint')}
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
          title={t('trip.shareEvent', { title: sharingEvent.title })}
        />
      )}
    </div>
  );
};

export default DayItinerary;

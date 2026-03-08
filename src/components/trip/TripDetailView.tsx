import React, { useState, useEffect, lazy, Suspense } from 'react';
import { Trip, Event, TripStatus } from '@/types';
import { normalizeCost } from '@/services/currencyService';
import ItineraryView from './ItineraryView';
import EditTripModal from '../modals/EditTripModal';
import ShareModal from '../modals/ShareModal';
import CollaboratorManager from '../modals/CollaboratorManager';
import BudgetBar from './BudgetBar';
import { CURRENCY_SYMBOLS, CATEGORY_DISPLAY_CONFIG } from '@/constants';
import { ArrowRight, MapPin, Calendar, DollarSign, Pencil, Trash2, Share2, Image, Download, Upload, Users, Map, List, CheckSquare, FileText, Compass, Plus, ChevronLeft } from 'lucide-react';

const TripMap = lazy(() => import('./TripMap'));
const TripChecklist = lazy(() => import('./TripChecklist'));
import { exportTripToJSON, parseImportFile, importSharedEvent } from '@/services/shareService';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { getLocationFromEvent } from '@/utils/helpers';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { format, parseISO } from 'date-fns';
import { he } from 'date-fns/locale';

const statusStyles: { [key in TripStatus]: string } = {
  [TripStatus.Idea]: "bg-trip-idea text-primary-foreground",
  [TripStatus.Planning]: "bg-trip-planning/20 text-trip-planning",
  [TripStatus.Booked]: "bg-trip-booked/20 text-trip-booked",
  [TripStatus.Completed]: "bg-muted text-muted-foreground",
};

interface TripDetailViewProps {
  trip: Trip;
  onBack: () => void;
  onUpdateTrip: (updatedTrip: Trip) => void;
  onDeleteTrip: (tripId: string) => void;
}

const TripDetailView: React.FC<TripDetailViewProps> = ({ trip, onBack, onUpdateTrip, onDeleteTrip }) => {
  const { user } = useAuth();
  const [totalCost, setTotalCost] = useState(0);
  const [isCalculating, setIsCalculating] = useState(true);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isCollabModalOpen, setIsCollabModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'itinerary' | 'map' | 'checklist'>('itinerary');

  const handleExportJSON = () => exportTripToJSON(trip);

  const handleImportEventJSON = async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file || !user) return;
      try {
        const payload = await parseImportFile(file);
        if (payload.type !== 'event') { toast({ title: 'הקובץ מכיל טיול, לא פעילות', variant: 'destructive' }); return; }
        await importSharedEvent(user.id, trip.id, payload.data, trip.events.length);
        const newEvent = { ...payload.data as any, id: crypto.randomUUID() };
        onUpdateTrip({ ...trip, events: [...trip.events, newEvent] });
        toast({ title: 'פעילות יובאה בהצלחה! 🎉' });
      } catch (err: any) {
        toast({ title: 'שגיאה בייבוא', description: err.message, variant: 'destructive' });
      }
    };
    input.click();
  };

  useEffect(() => {
    const calc = async () => {
      setIsCalculating(true);
      const costs = await Promise.all(trip.events.map(e => normalizeCost(e.amount, e.currency, trip.base_currency, e.date)));
      setTotalCost(costs.reduce((sum, c) => sum + c, 0));
      setIsCalculating(false);
    };
    calc();
  }, [trip]);

  const handleAddEvent = (event: Event) => onUpdateTrip({ ...trip, events: [...trip.events, event] });
  const handleUpdateEvent = (event: Event) => onUpdateTrip({ ...trip, events: trip.events.map(e => e.id === event.id ? event : e) });
  const handleDeleteEvent = (eventId: string) => {
    if (window.confirm("Delete this event?")) onUpdateTrip({ ...trip, events: trip.events.filter(e => e.id !== eventId) });
  };
  const confirmDeleteTrip = () => {
    if (window.confirm(`Delete "${trip.name}"? This cannot be undone.`)) onDeleteTrip(trip.id);
  };

  const handleExportFullPDF = async () => {
    toast({ title: 'מייצר PDF של כל הטיול... ⏳' });
    const days: string[] = [];
    const start = new Date(trip.start_date + 'T00:00:00');
    const end = new Date(trip.end_date + 'T00:00:00');
    let current = new Date(start);
    while (current <= end) {
      const y = current.getFullYear();
      const m = String(current.getMonth() + 1).padStart(2, '0');
      const d = String(current.getDate()).padStart(2, '0');
      days.push(`${y}-${m}-${d}`);
      current.setDate(current.getDate() + 1);
    }
    const dailyInfoMap = (trip as any).daily_info || trip.dailyInfo || {};
    const totalCostStr = totalCost.toLocaleString(undefined, { style: 'currency', currency: trip.base_currency, minimumFractionDigits: 0, maximumFractionDigits: 0 });
    let allDaysHtml = `
      <div style="background:#375ab4;color:white;padding:30px 24px;margin-bottom:20px;border-radius:8px;">
        <div style="font-size:28px;font-weight:bold;margin-bottom:8px;">${trip.name}</div>
        ${trip.destination ? `<div style="font-size:14px;margin-bottom:4px;">📍 ${trip.destination}</div>` : ''}
        <div style="font-size:13px;">${trip.start_date} → ${trip.end_date}</div>
        <div style="font-size:13px;margin-top:6px;">סה"כ: ${totalCostStr}</div>
      </div>
    `;
    days.forEach((date, idx) => {
      const dayEvents = trip.events.filter(e => e.date === date).sort((a, b) => a.time.localeCompare(b.time));
      const info = dailyInfoMap[date] || {};
      const dayTotal = dayEvents.reduce((s, e) => s + e.amount, 0);
      const dayTotalStr = `${CURRENCY_SYMBOLS[trip.base_currency] || ''}${dayTotal.toLocaleString()}`;
      let eventsHtml = '';
      dayEvents.forEach((event) => {
        const config = CATEGORY_DISPLAY_CONFIG[event.category];
        const amountStr = `${CURRENCY_SYMBOLS[event.currency] || ''}${event.amount.toLocaleString()}`;
        const loc = getLocationFromEvent(event);
        let detailLine = '';
        if (loc) detailLine += loc;
        if (event.notes) detailLine += (detailLine ? '  |  ' : '') + event.notes;
        eventsHtml += `
          <div style="background:#f8f8fc;border:1px solid #dcdce6;border-radius:6px;padding:8px 10px;margin-bottom:8px;">
            <div style="margin-bottom:3px;">
              <span style="color:#64647a;font-size:10px;font-weight:bold;margin-left:8px;">${event.time}</span>
              <span style="color:#375ab4;font-size:9px;">${config?.name || event.category}</span>
            </div>
            <div style="display:flex;justify-content:space-between;align-items:center;">
              <span style="color:#1e1e32;font-size:14px;font-weight:bold;">${event.title}</span>
              <span style="color:#e67832;font-size:12px;font-weight:bold;">${amountStr}</span>
            </div>
            ${detailLine ? `<div style="color:#78788c;font-size:9px;margin-top:3px;">${detailLine}</div>` : ''}
          </div>
        `;
      });
      const dayDate = new Date(date + 'T00:00:00');
      allDaysHtml += `
        <div style="margin-bottom:20px;page-break-inside:avoid;">
          <div style="background:#4a6bc5;color:white;padding:10px 16px;border-radius:6px 6px 0 0;display:flex;justify-content:space-between;align-items:center;">
            <span style="font-size:15px;font-weight:bold;">יום ${idx + 1} — ${dayDate.getDate()}/${dayDate.getMonth() + 1}/${dayDate.getFullYear()}</span>
            <span style="font-size:12px;">${dayTotalStr}</span>
          </div>
          <div style="border:1px solid #dcdce6;border-top:none;border-radius:0 0 6px 6px;padding:12px 16px;">
            ${info.startPoint ? `<div style="color:#228b22;font-size:11px;font-weight:bold;margin-bottom:8px;">📍 התחלה: ${info.startPoint}</div>` : ''}
            ${dayEvents.length > 0 ? eventsHtml : '<div style="color:#999;font-size:11px;text-align:center;padding:8px;">אין פעילויות ליום זה</div>'}
            ${info.endPoint ? `<div style="color:#c83232;font-size:11px;font-weight:bold;margin-top:8px;">🏁 סיום: ${info.endPoint}</div>` : ''}
          </div>
        </div>
      `;
    });
    allDaysHtml += `
      <hr style="border:none;border-top:1px solid #c8c8d2;margin:10px 0;"/>
      <div style="display:flex;justify-content:space-between;color:#64647a;font-size:10px;">
        <span>Generated by WonderJourney</span>
        <span>${new Date().toLocaleDateString()}</span>
      </div>
    `;
    const fullHtml = `<div style="font-family:'Segoe UI',Tahoma,Arial,sans-serif;direction:rtl;width:700px;padding:20px;background:white;">${allDaysHtml}</div>`;
    const container = document.createElement('div');
    container.style.position = 'fixed';
    container.style.left = '-10000px';
    container.style.top = '0';
    container.style.width = '700px';
    container.style.background = 'white';
    container.innerHTML = fullHtml;
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
        let srcY = 0;
        let page = 0;
        let remainingH = imgH;
        while (remainingH > 0) {
          if (page > 0) doc.addPage();
          doc.addImage(imgData, 'PNG', 0, -srcY, imgW, imgH);
          srcY += pageH;
          remainingH -= pageH;
          page++;
        }
      }
      doc.save(`${trip.name}_Full_Trip.pdf`);
      toast({ title: 'PDF נוצר בהצלחה! 📄' });
    } finally {
      document.body.removeChild(container);
    }
  };

  // Calculate category breakdown for sidebar
  const categoryBreakdown = trip.events.reduce((acc, e) => {
    const cat = e.category;
    if (!acc[cat]) acc[cat] = 0;
    acc[cat] += e.amount;
    return acc;
  }, {} as Record<string, number>);

  const tripDays = (() => {
    const start = new Date(trip.start_date + 'T00:00:00');
    const end = new Date(trip.end_date + 'T00:00:00');
    return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  })();

  const symbol = CURRENCY_SYMBOLS[trip.base_currency] || trip.base_currency;

  return (
    <div className="min-h-screen animate-fade-in" dir="rtl">
      {/* Hero Header */}
      <header className="relative overflow-hidden">
        <div className="h-64 sm:h-80 relative">
          <img
            src={trip.cover_image || 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=1600&q=80'}
            alt={trip.name}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-foreground/90 via-foreground/40 to-foreground/10" />
        </div>

        {/* Overlay content */}
        <div className="absolute inset-0 flex flex-col justify-end p-4 sm:p-8">
          {/* Breadcrumbs */}
          <div className="flex items-center gap-1.5 text-primary-foreground/60 text-xs mb-3">
            <button onClick={onBack} className="hover:text-primary-foreground transition-colors">ראשי</button>
            <ChevronRight className="h-3 w-3" />
            <span className="hover:text-primary-foreground transition-colors cursor-default">הטיולים שלי</span>
            {trip.destination && (
              <>
                <ChevronRight className="h-3 w-3" />
                <span className="text-primary-foreground/80">{trip.destination}</span>
              </>
            )}
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold font-display text-primary-foreground mb-2">
            {trip.name}
          </h1>
          <div className="flex flex-wrap items-center gap-3 text-primary-foreground/80 text-sm">
            <span className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              {trip.start_date} – {trip.end_date}
            </span>
            <span>•</span>
            <span>{tripDays} ימים</span>
          </div>
        </div>

        {/* Back button */}
        <button
          onClick={onBack}
          className="absolute top-4 right-4 sm:top-6 sm:right-8 bg-card/80 backdrop-blur-sm text-foreground p-2 rounded-xl hover:bg-card transition-colors shadow-sm"
        >
          <ArrowRight className="h-5 w-5" />
        </button>
      </header>

      {/* Main content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-6 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6">
          {/* Left: Itinerary */}
          <div>
            {/* Action bar */}
            <div className="bg-card border border-border rounded-2xl p-3 mb-6 flex flex-col sm:flex-row items-start sm:items-center gap-3 shadow-sm">
              {/* Tabs */}
              <div className="flex bg-secondary rounded-lg p-1 gap-1 flex-1 w-full sm:w-auto">
                <button
                  onClick={() => setActiveTab('itinerary')}
                  className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    activeTab === 'itinerary' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <List className="h-4 w-4" /> מסלול
                </button>
                <button
                  onClick={() => setActiveTab('map')}
                  className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    activeTab === 'map' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Map className="h-4 w-4" /> מפה
                </button>
                <button
                  onClick={() => setActiveTab('checklist')}
                  className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    activeTab === 'checklist' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <CheckSquare className="h-4 w-4" /> צ'קליסט
                </button>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1 flex-wrap">
                <button onClick={() => setIsCollabModalOpen(true)} className="btn-ghost p-2 rounded-lg" title="שיתוף פעולה"><Users className="h-4 w-4" /></button>
                <button onClick={() => setIsShareModalOpen(true)} className="btn-ghost p-2 rounded-lg" title="שתף"><Share2 className="h-4 w-4" /></button>
                <button onClick={handleExportJSON} className="btn-ghost p-2 rounded-lg" title="ייצוא JSON"><Download className="h-4 w-4" /></button>
                <button onClick={handleExportFullPDF} className="btn-ghost p-2 rounded-lg" title="ייצוא PDF"><FileText className="h-4 w-4" /></button>
                <button onClick={handleImportEventJSON} className="btn-ghost p-2 rounded-lg hidden sm:inline-flex" title="ייבוא פעילות"><Upload className="h-4 w-4" /></button>
                <button onClick={() => setIsEditModalOpen(true)} className="btn-ghost p-2 rounded-lg" title="ערוך"><Pencil className="h-4 w-4" /></button>
                <button onClick={confirmDeleteTrip} className="btn-ghost p-2 rounded-lg text-destructive" title="מחק"><Trash2 className="h-4 w-4" /></button>
              </div>
            </div>

            {/* Content */}
            {activeTab === 'itinerary' ? (
              <ItineraryView
                trip={trip}
                onAddEvent={handleAddEvent}
                onUpdateEvent={handleUpdateEvent}
                onDeleteEvent={handleDeleteEvent}
                onUpdateTrip={onUpdateTrip}
              />
            ) : activeTab === 'checklist' ? (
              <Suspense fallback={<div className="card-surface p-12 flex items-center justify-center"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>}>
                <TripChecklist tripId={trip.id} />
              </Suspense>
            ) : (
              <Suspense fallback={<div className="card-surface p-12 flex items-center justify-center"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>}>
                <TripMap trip={trip} />
              </Suspense>
            )}
          </div>

          {/* Right sidebar */}
          <div className="space-y-5">
            {/* Booking summary */}
            <div className="bg-card border border-border rounded-2xl p-5 sticky top-20">
              <h3 className="font-bold text-sm mb-4">סיכום הזמנה</h3>

              {/* Category breakdown */}
              <div className="space-y-2.5 text-sm">
                {Object.entries(categoryBreakdown).map(([cat, amount]) => {
                  const config = CATEGORY_DISPLAY_CONFIG[cat];
                  return (
                    <div key={cat} className="flex items-center justify-between">
                      <span className="text-muted-foreground">{config?.name || cat}</span>
                      <span className="font-medium">{symbol}{(amount as number).toLocaleString()}</span>
                    </div>
                  );
                })}
              </div>

              <div className="border-t border-border my-3 pt-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold">סה"כ לתשלום</span>
                  <span className="font-bold text-lg text-accent">
                    {isCalculating ? '...' : `${symbol}${totalCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
                  </span>
                </div>
              </div>

              <BudgetBar trip={trip} totalCost={totalCost} isCalculating={isCalculating} />

              {/* Quick actions */}
              <div className="mt-4 space-y-2">
                <button onClick={() => setIsShareModalOpen(true)} className="w-full btn-secondary flex items-center justify-center gap-2 text-sm">
                  <Share2 className="h-4 w-4" /> שתף מסלול
                </button>
                <button onClick={() => setIsEditModalOpen(true)} className="w-full btn-ghost flex items-center justify-center gap-2 text-sm border border-border">
                  <Pencil className="h-4 w-4" /> ערוך פרטים
                </button>
              </div>
            </div>

            {/* Status badge */}
            <div className="bg-card border border-border rounded-2xl p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">סטטוס</span>
                <span className={`status-badge ${statusStyles[trip.status]}`}>
                  {trip.status}
                </span>
              </div>
              {trip.album_link && (
                <a href={trip.album_link} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 mt-3 text-sm text-primary hover:underline">
                  <Image className="h-4 w-4" /> אלבום תמונות
                </a>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      <EditTripModal isOpen={isEditModalOpen} trip={trip} onClose={() => setIsEditModalOpen(false)} onUpdateTrip={onUpdateTrip} />
      <ShareModal isOpen={isShareModalOpen} onClose={() => setIsShareModalOpen(false)} title={`שתף "${trip.name}"`} itemType="trip" itemData={trip} />
      <CollaboratorManager isOpen={isCollabModalOpen} onClose={() => setIsCollabModalOpen(false)} tripId={trip.id} tripName={trip.name} />
    </div>
  );
};

export default TripDetailView;

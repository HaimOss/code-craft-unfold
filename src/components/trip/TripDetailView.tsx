import React, { useState, useEffect, lazy, Suspense } from 'react';
import { Trip, Event, TripStatus } from '@/types';
import { normalizeCost } from '@/services/currencyService';
import ItineraryView from './ItineraryView';
import EditTripModal from '../modals/EditTripModal';
import ShareModal from '../modals/ShareModal';
import CollaboratorManager from '../modals/CollaboratorManager';
import BudgetBar from './BudgetBar';
import { CURRENCY_SYMBOLS, CATEGORY_DISPLAY_CONFIG } from '@/constants';
import { ArrowLeft, MapPin, Calendar, DollarSign, Pencil, Trash2, Share2, Image, Download, Upload, Users, Map, List, CheckSquare, FileText, Compass } from 'lucide-react';

const TripMap = lazy(() => import('./TripMap'));
const TripChecklist = lazy(() => import('./TripChecklist'));
import { exportTripToJSON, parseImportFile, importSharedEvent } from '@/services/shareService';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { getLocationFromEvent } from '@/utils/helpers';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

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

    // Build trip days
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

    const dailyInfoMap = (trip as any).daily_info || {};
    const totalCostStr = totalCost.toLocaleString(undefined, { style: 'currency', currency: trip.base_currency, minimumFractionDigits: 0, maximumFractionDigits: 0 });

    // Build HTML for entire trip
    let allDaysHtml = '';

    // Cover page
    allDaysHtml += `
      <div style="background:#375ab4;color:white;padding:30px 24px;margin-bottom:20px;border-radius:8px;">
        <div style="font-size:28px;font-weight:bold;margin-bottom:8px;">${trip.name}</div>
        ${trip.destination ? `<div style="font-size:14px;margin-bottom:4px;">📍 ${trip.destination}</div>` : ''}
        <div style="font-size:13px;">${trip.start_date} → ${trip.end_date}</div>
        <div style="font-size:13px;margin-top:6px;">סה"כ: ${totalCostStr}</div>
      </div>
    `;

    days.forEach((date, idx) => {
      const dayEvents = trip.events
        .filter(e => e.date === date)
        .sort((a, b) => a.time.localeCompare(b.time));
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

    // Footer
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

  return (
    <div className="p-4 sm:p-6 lg:p-8 min-h-screen animate-fade-in">
      <button onClick={onBack} className="btn-ghost flex items-center text-sm mb-6">
        <ArrowLeft className="h-4 w-4 mr-2" /> Back to Dashboard
      </button>

      <header className="relative overflow-hidden rounded-2xl shadow-lg mb-8">
        {trip.cover_image && (
          <div className="absolute inset-0">
            <img src={trip.cover_image} alt="" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-foreground/90 via-foreground/50 to-foreground/20" />
          </div>
        )}
        <div className={`relative p-6 sm:p-8 ${!trip.cover_image ? 'bg-primary' : ''}`}>
          <div className="flex flex-col sm:flex-row justify-between items-start">
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold font-display text-primary-foreground">{trip.name}</h1>
              <div className="flex flex-wrap gap-4 mt-4 text-primary-foreground/80 text-sm">
                {trip.destination && (
                  <span className="flex items-center"><MapPin className="h-4 w-4 mr-1.5 opacity-70" />{trip.destination}</span>
                )}
                <span className="flex items-center"><Calendar className="h-4 w-4 mr-1.5 opacity-70" />{trip.start_date} → {trip.end_date}</span>
                <span className="flex items-center">
                  <DollarSign className="h-4 w-4 mr-1.5 opacity-70" />
                  {isCalculating ? (
                    <div className="h-5 w-20 bg-primary-foreground/20 rounded animate-pulse" />
                  ) : (
                    <span>{totalCost.toLocaleString(undefined, { style: 'currency', currency: trip.base_currency, minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
                  )}
                </span>
                {trip.album_link && (
                  <a href={trip.album_link} target="_blank" rel="noopener noreferrer" className="flex items-center text-primary-foreground/80 hover:text-primary-foreground transition-colors">
                    <Image className="h-4 w-4 mr-1.5 opacity-70" /> Photo Album
                  </a>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 mt-4 sm:mt-0">
              <span className={`status-badge ${statusStyles[trip.status]}`}>{trip.status.split(' ')[0]}</span>
              <div className="flex items-center bg-primary-foreground/10 rounded-full p-1">
                <button onClick={() => setIsCollabModalOpen(true)} className="p-2 text-primary-foreground/70 rounded-full hover:bg-primary-foreground/10 transition-colors" title="שיתוף פעולה"><Users className="h-4 w-4" /></button>
                <button onClick={() => setIsShareModalOpen(true)} className="p-2 text-primary-foreground/70 rounded-full hover:bg-primary-foreground/10 transition-colors" title="שתף"><Share2 className="h-4 w-4" /></button>
                <button onClick={handleExportJSON} className="p-2 text-primary-foreground/70 rounded-full hover:bg-primary-foreground/10 transition-colors" title="ייצוא JSON"><Download className="h-4 w-4" /></button>
                <button onClick={handleExportFullPDF} className="p-2 text-primary-foreground/70 rounded-full hover:bg-primary-foreground/10 transition-colors" title="ייצוא PDF מלא"><FileText className="h-4 w-4" /></button>
                <button onClick={handleImportEventJSON} className="p-2 text-primary-foreground/70 rounded-full hover:bg-primary-foreground/10 transition-colors" title="ייבוא פעילות"><Upload className="h-4 w-4" /></button>
                <button onClick={() => setIsEditModalOpen(true)} className="p-2 text-primary-foreground/70 rounded-full hover:bg-primary-foreground/10 transition-colors" title="ערוך"><Pencil className="h-4 w-4" /></button>
                <button onClick={confirmDeleteTrip} className="p-2 text-destructive/70 rounded-full hover:bg-primary-foreground/10 transition-colors" title="מחק"><Trash2 className="h-4 w-4" /></button>
              </div>
            </div>
          </div>
          <BudgetBar trip={trip} totalCost={totalCost} isCalculating={isCalculating} />
        </div>
      </header>

      <main>
        <div className="flex items-center gap-4 mb-6">
          <h2 className="text-2xl font-bold font-display">
            {activeTab === 'itinerary' ? 'Itinerary' : activeTab === 'map' ? 'Map' : 'Checklist'}
          </h2>
          <div className="flex bg-secondary rounded-lg p-1 gap-1">
            <button
              onClick={() => setActiveTab('itinerary')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'itinerary'
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <List className="h-4 w-4" /> מסלול
            </button>
            <button
              onClick={() => setActiveTab('map')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'map'
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Map className="h-4 w-4" /> מפה
            </button>
            <button
              onClick={() => setActiveTab('checklist')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'checklist'
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <CheckSquare className="h-4 w-4" /> צ'קליסט
            </button>
          </div>
        </div>

        {activeTab === 'itinerary' ? (
          <ItineraryView
            trip={trip}
            onAddEvent={handleAddEvent}
            onUpdateEvent={handleUpdateEvent}
            onDeleteEvent={handleDeleteEvent}
            onUpdateTrip={onUpdateTrip}
          />
        ) : activeTab === 'checklist' ? (
          <Suspense fallback={
            <div className="card-surface p-12 flex items-center justify-center">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          }>
            <TripChecklist tripId={trip.id} />
          </Suspense>
        ) : (
          <Suspense fallback={
            <div className="card-surface p-12 flex items-center justify-center">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          }>
            <TripMap trip={trip} />
          </Suspense>
        )}
      </main>

      <EditTripModal isOpen={isEditModalOpen} trip={trip} onClose={() => setIsEditModalOpen(false)} onUpdateTrip={onUpdateTrip} />
      <ShareModal isOpen={isShareModalOpen} onClose={() => setIsShareModalOpen(false)} title={`שתף "${trip.name}"`} itemType="trip" itemData={trip} />
      <CollaboratorManager isOpen={isCollabModalOpen} onClose={() => setIsCollabModalOpen(false)} tripId={trip.id} tripName={trip.name} />
    </div>
  );
};

export default TripDetailView;

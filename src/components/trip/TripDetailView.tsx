import React, { useState, useEffect } from 'react';
import { Trip, Event, TripStatus } from '@/types';
import { normalizeCost } from '@/services/currencyService';
import ItineraryView from './ItineraryView';
import EditTripModal from '../modals/EditTripModal';
import ShareModal from '../modals/ShareModal';
import { CURRENCY_SYMBOLS } from '@/constants';
import { ArrowLeft, MapPin, Calendar, DollarSign, Pencil, Trash2, Share2, Image, Download, Upload } from 'lucide-react';
import { exportTripToJSON, parseImportFile, importSharedEvent } from '@/services/shareService';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

const statusStyles: { [key in TripStatus]: string } = {
  [TripStatus.Idea]: "bg-trip-idea/20 text-trip-idea",
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
  const [totalCost, setTotalCost] = useState(0);
  const [isCalculating, setIsCalculating] = useState(true);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

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
                <button onClick={() => setIsShareModalOpen(true)} className="p-2 text-primary-foreground/70 rounded-full hover:bg-primary-foreground/10 transition-colors" title="Share"><Share2 className="h-4 w-4" /></button>
                <button onClick={() => setIsEditModalOpen(true)} className="p-2 text-primary-foreground/70 rounded-full hover:bg-primary-foreground/10 transition-colors" title="Edit"><Pencil className="h-4 w-4" /></button>
                <button onClick={confirmDeleteTrip} className="p-2 text-destructive/70 rounded-full hover:bg-primary-foreground/10 transition-colors" title="Delete"><Trash2 className="h-4 w-4" /></button>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main>
        <h2 className="text-2xl font-bold font-display mb-6">Itinerary</h2>
        <ItineraryView
          trip={trip}
          onAddEvent={handleAddEvent}
          onUpdateEvent={handleUpdateEvent}
          onDeleteEvent={handleDeleteEvent}
          onUpdateTrip={onUpdateTrip}
        />
      </main>

      <EditTripModal isOpen={isEditModalOpen} trip={trip} onClose={() => setIsEditModalOpen(false)} onUpdateTrip={onUpdateTrip} />
      <ShareModal isOpen={isShareModalOpen} onClose={() => setIsShareModalOpen(false)} shareUrl={`${window.location.origin}${window.location.pathname}#share/trip/${trip.id}`} title={`Share "${trip.name}"`} />
    </div>
  );
};

export default TripDetailView;

import React, { useState } from 'react';
import { Trip, Event } from '@/types';
import TripCard from '@/components/trip/TripCard';
import AddTripModal from '@/components/modals/AddTripModal';
import { Plus, Upload } from 'lucide-react';
import { parseImportFile, importSharedTrip } from '@/services/shareService';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { toast } from '@/hooks/use-toast';

interface TripsGridProps {
  trips: Trip[];
  onSelectTrip: (tripId: string) => void;
  onAddTrip: (newTrip: Trip) => void;
}

const TripsGrid: React.FC<TripsGridProps> = ({ trips, onSelectTrip, onAddTrip }) => {
  const { user } = useAuth();
  const { t, dir } = useLanguage();
  const [isAddTripModalOpen, setIsAddTripModalOpen] = useState(false);

  const handleImportJSON = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file || !user) return;
      try {
        const payload = await parseImportFile(file);
        if (payload.type !== 'trip') { toast({ title: t('toast.fileContainsActivity'), variant: 'destructive' }); return; }
        const newId = await importSharedTrip(user.id, payload.data);
        onAddTrip({ ...(payload.data as any), id: newId, name: (payload.data as any).name + ' (imported)', events: (payload.data as any).events || [] });
        toast({ title: t('toast.tripImported') });
      } catch (err: any) {
        toast({ title: t('toast.importError'), description: err.message, variant: 'destructive' });
      }
    };
    input.click();
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto" dir={dir}>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold font-display">{t('trips.myTrips')}</h1>
        <div className="flex items-center gap-2">
          <button onClick={handleImportJSON} className="btn-ghost flex items-center gap-2 text-sm">
            <Upload className="h-4 w-4" /> {t('trips.importBtn')}
          </button>
          <button onClick={() => setIsAddTripModalOpen(true)} className="btn-primary flex items-center gap-2 text-sm">
            <Plus className="h-4 w-4" /> {t('trips.newTrip')}
          </button>
        </div>
      </div>

      {trips.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <p className="text-6xl mb-4">🌍</p>
          <h2 className="text-2xl font-bold font-display mb-2">{t('trips.noTrips')}</h2>
          <p className="text-muted-foreground mb-6">{t('trips.startPlanning')}</p>
          <button onClick={() => setIsAddTripModalOpen(true)} className="btn-primary flex items-center gap-2">
            <Plus className="h-4 w-4" /> {t('trips.createFirst')}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {trips.map(trip => (
            <TripCard key={trip.id} trip={trip} onSelectTrip={onSelectTrip} />
          ))}
        </div>
      )}

      <AddTripModal isOpen={isAddTripModalOpen} onClose={() => setIsAddTripModalOpen(false)} onAddTrip={onAddTrip} />
    </div>
  );
};

export default TripsGrid;

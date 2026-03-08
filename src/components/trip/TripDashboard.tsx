import React, { useState } from 'react';
import { Trip, Event, User } from '@/types';
import TripCard from './TripCard';
import AddTripModal from '../modals/AddTripModal';
import ActivityArchive from './ActivityArchive';
import StatsDashboard from './StatsDashboard';
import { Plus, LogOut, Compass, Archive, Upload, BarChart3 } from 'lucide-react';
import { parseImportFile, importSharedTrip } from '@/services/shareService';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface TripDashboardProps {
  trips: Trip[];
  onSelectTrip: (tripId: string) => void;
  onAddTrip: (newTrip: Trip) => void;
  onUpdateTrip: (updatedTrip: Trip) => void;
  unscheduledEvents: Event[];
  onAddUnscheduledEvent: (newEvent: Event) => void;
  onLogout: () => void;
}

const TripDashboard: React.FC<TripDashboardProps> = ({
  trips, onSelectTrip, onAddTrip, onUpdateTrip, onLogout,
}) => {
  const { user } = useAuth();
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
        if (payload.type !== 'trip') { toast({ title: 'הקובץ מכיל פעילות, לא טיול. ייבא מתוך טיול קיים.', variant: 'destructive' }); return; }
        const newId = await importSharedTrip(user.id, payload.data);
        // Reload by adding the trip locally
        onAddTrip({ ...(payload.data as any), id: newId, name: (payload.data as any).name + ' (imported)', events: (payload.data as any).events || [] });
        toast({ title: 'טיול יובא בהצלחה! 🎉' });
      } catch (err: any) {
        toast({ title: 'שגיאה בייבוא', description: err.message, variant: 'destructive' });
      }
    };
    input.click();
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-6 border-b border-border mb-8">
        <div>
          <h1 className="text-4xl font-bold font-display flex items-center gap-3">
            <Compass className="h-8 w-8 text-accent" />
            WonderJourney
          </h1>
          <p className="mt-1 text-muted-foreground">Your personal travel journal and planner.</p>
        </div>
        <div className="flex items-center space-x-3 mt-4 sm:mt-0">
          <button onClick={() => setIsAddTripModalOpen(true)} className="btn-primary flex items-center gap-2">
            <Plus className="h-4 w-4" /> טיול חדש
          </button>
          <button onClick={handleImportJSON} className="btn-secondary flex items-center gap-2">
            <Upload className="h-4 w-4" /> ייבוא טיול
          </button>
          <button onClick={onLogout} title="Reset Demo" className="btn-ghost p-2">
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </header>

      <Tabs defaultValue="trips" className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="trips" className="flex items-center gap-2">
            <Compass className="h-4 w-4" /> טיולים
          </TabsTrigger>
          <TabsTrigger value="archive" className="flex items-center gap-2">
            <Archive className="h-4 w-4" /> ארכיון פעילויות
          </TabsTrigger>
          <TabsTrigger value="stats" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" /> סטטיסטיקות
          </TabsTrigger>
        </TabsList>

        <TabsContent value="trips">
          {trips.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <p className="text-6xl mb-4">🌍</p>
              <h2 className="text-2xl font-bold font-display mb-2">No Trips Yet</h2>
              <p className="text-muted-foreground mb-6">Start planning your next adventure!</p>
              <button onClick={() => setIsAddTripModalOpen(true)} className="btn-primary flex items-center gap-2">
                <Plus className="h-4 w-4" /> Create Your First Trip
              </button>
            </div>
          ) : (
            <main className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {trips.map(trip => (
                <TripCard key={trip.id} trip={trip} onSelectTrip={onSelectTrip} />
              ))}
            </main>
          )}
        </TabsContent>

        <TabsContent value="archive">
          <ActivityArchive trips={trips} />
        </TabsContent>

        <TabsContent value="stats">
          <StatsDashboard trips={trips} />
        </TabsContent>
      </Tabs>

      <AddTripModal isOpen={isAddTripModalOpen} onClose={() => setIsAddTripModalOpen(false)} onAddTrip={onAddTrip} />
    </div>
  );
};

export default TripDashboard;

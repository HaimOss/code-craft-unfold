import React, { useState, useEffect, useCallback } from 'react';
import { Trip, Event } from '@/types';
import TripDashboard from '@/components/trip/TripDashboard';
import TripDetailView from '@/components/trip/TripDetailView';
import { useAuth } from '@/contexts/AuthContext';
import { fetchTrips, createTrip, updateTrip, deleteTrip, syncTripEvents } from '@/services/tripService';
import { toast } from '@/hooks/use-toast';

const Index = () => {
  const { user, signOut } = useAuth();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadTrips = useCallback(async () => {
    if (!user) return;
    try {
      const data = await fetchTrips(user.id);
      setTrips(data);
    } catch (err: any) {
      toast({ title: 'שגיאה בטעינת טיולים', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadTrips();
  }, [loadTrips]);

  const handleSelectTrip = (tripId: string) => setSelectedTripId(tripId);
  const handleBackToDashboard = () => setSelectedTripId(null);

  const handleAddTrip = async (newTrip: Trip) => {
    if (!user) return;
    try {
      const id = await createTrip(user.id, newTrip);
      setTrips(prev => [{ ...newTrip, id, events: [] }, ...prev]);
      setSelectedTripId(id);
    } catch (err: any) {
      toast({ title: 'שגיאה ביצירת טיול', description: err.message, variant: 'destructive' });
    }
  };

  const handleUpdateTrip = async (updatedTrip: Trip) => {
    if (!user) return;
    setTrips(prev => prev.map(t => t.id === updatedTrip.id ? updatedTrip : t));
    try {
      await syncTripEvents(user.id, updatedTrip);
    } catch (err: any) {
      toast({ title: 'שגיאה בעדכון', description: err.message, variant: 'destructive' });
      loadTrips(); // reload on error
    }
  };

  const handleDeleteTrip = async (tripId: string) => {
    try {
      await deleteTrip(tripId);
      setTrips(prev => prev.filter(t => t.id !== tripId));
      setSelectedTripId(null);
    } catch (err: any) {
      toast({ title: 'שגיאה במחיקה', description: err.message, variant: 'destructive' });
    }
  };

  const handleLogout = async () => {
    await signOut();
  };

  const selectedTrip = trips.find(t => t.id === selectedTripId);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">טוען את הטיולים שלך...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {selectedTrip ? (
        <TripDetailView
          trip={selectedTrip}
          onBack={handleBackToDashboard}
          onUpdateTrip={handleUpdateTrip}
          onDeleteTrip={handleDeleteTrip}
        />
      ) : (
        <TripDashboard
          trips={trips}
          onSelectTrip={handleSelectTrip}
          onAddTrip={handleAddTrip}
          unscheduledEvents={[]}
          onAddUnscheduledEvent={() => {}}
          onLogout={handleLogout}
        />
      )}
    </div>
  );
};

export default Index;

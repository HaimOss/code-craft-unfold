import React, { useState, useEffect, useCallback } from 'react';
import { Trip, Event } from '@/types';
import TripDashboard from '@/components/trip/TripDashboard';
import TripDetailView from '@/components/trip/TripDetailView';
import { useAuth } from '@/contexts/AuthContext';
import { fetchTrips, createTrip, updateTrip, deleteTrip, syncTripEvents } from '@/services/tripService';
import { fetchSharedTrips } from '@/services/collaborationService';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

const Index = () => {
  const { user, signOut } = useAuth();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadTrips = useCallback(async () => {
    if (!user) return;
    try {
      const ownTrips = await fetchTrips(user.id);

      // Also fetch shared trips
      const sharedTripIds = await fetchSharedTrips(user.id);
      let sharedTrips: Trip[] = [];
      if (sharedTripIds.length > 0) {
        // Fetch each shared trip's data
        for (const tripId of sharedTripIds) {
          const { data: tripData } = await supabase.from('trips').select('*').eq('id', tripId).single();
          const { data: eventsData } = await supabase.from('events').select('*').eq('trip_id', tripId).order('sort_order', { ascending: true });
          if (tripData) {
            const trip: Trip = {
              id: tripData.id,
              name: tripData.name + ' (shared)',
              destination: tripData.destination || undefined,
              start_date: tripData.start_date,
              end_date: tripData.end_date,
              base_currency: tripData.base_currency,
              status: tripData.status as any,
              cover_image: tripData.cover_image || undefined,
              album_link: tripData.album_link || undefined,
              dailyInfo: (tripData.daily_info as any) || {},
              budget: tripData.budget ? Number(tripData.budget) : undefined,
              events: (eventsData || []).map((e: any) => ({
                id: e.id, date: e.date, time: e.time, endTime: e.end_time || undefined,
                category: e.category as any, title: e.title, amount: Number(e.amount),
                currency: e.currency, payment_method: e.payment_method as any,
                details: e.details || {}, notes: e.notes || undefined, rating: e.rating || undefined,
              })),
            };
            sharedTrips.push(trip);
          }
        }
      }

      setTrips([...ownTrips, ...sharedTrips]);
    } catch (err: any) {
      toast({ title: 'שגיאה בטעינת טיולים', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadTrips();
  }, [loadTrips]);

  // Realtime subscriptions
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('trip-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'trips' }, () => {
        loadTrips();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'events' }, () => {
        loadTrips();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, loadTrips]);

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
      loadTrips();
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
          onUpdateTrip={handleUpdateTrip}
          unscheduledEvents={[]}
          onAddUnscheduledEvent={() => {}}
          onLogout={handleLogout}
        />
      )}
    </div>
  );
};

export default Index;

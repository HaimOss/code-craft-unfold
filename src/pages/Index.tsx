import React, { useState, useEffect, useCallback } from 'react';
import { Trip, Event } from '@/types';
import TripDetailView from '@/components/trip/TripDetailView';
import DashboardHome from '@/components/dashboard/DashboardHome';
import TripsGrid from '@/components/dashboard/TripsGrid';
import ActivityArchive from '@/components/trip/ActivityArchive';
import ActivityBank from '@/components/activitybank/ActivityBank';
import StatsDashboard from '@/components/trip/StatsDashboard';
import SettingsView from '@/components/dashboard/SettingsView';
import NotificationsView from '@/components/dashboard/NotificationsView';
import NotificationBell from '@/components/NotificationBell';
import AppSidebar, { AppView } from '@/components/layout/AppSidebar';
import TopBar from '@/components/layout/TopBar';
import AddTripModal from '@/components/modals/AddTripModal';
import { SidebarProvider } from '@/components/ui/sidebar';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { fetchTrips, createTrip, updateTrip, deleteTrip, syncTripEvents } from '@/services/tripService';
import { fetchSharedTrips } from '@/services/collaborationService';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

const Index = () => {
  const { user, signOut } = useAuth();
  const { t, dir } = useLanguage();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState<AppView>('dashboard');
  const [isAddTripModalOpen, setIsAddTripModalOpen] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [notificationCount, setNotificationCount] = useState(0);

  const loadTrips = useCallback(async () => {
    if (!user) return;
    try {
      const ownTrips = await fetchTrips(user.id);
      const sharedTripIds = await fetchSharedTrips(user.id);
      let sharedTrips: Trip[] = [];
      if (sharedTripIds.length > 0) {
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
      toast({ title: t('toast.loadError'), description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [user, t]);

  useEffect(() => {
    if (!user) return;
    supabase.from('profiles').select('display_name').eq('id', user.id).single().then(({ data }) => {
      if (data?.display_name) setDisplayName(data.display_name);
      else setDisplayName(user.email?.split('@')[0] || '');
    });
  }, [user]);

  useEffect(() => {
    if (!user) return;
    supabase.from('notifications').select('id', { count: 'exact', head: true }).eq('user_id', user.id).eq('is_read', false).then(({ count }) => {
      setNotificationCount(count || 0);
    });
  }, [user]);

  useEffect(() => { loadTrips(); }, [loadTrips]);

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel('trip-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'trips' }, () => loadTrips())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'events' }, () => loadTrips())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, loadTrips]);

  const handleSelectTrip = (tripId: string) => { setSelectedTripId(tripId); };
  const handleBackToDashboard = () => { setSelectedTripId(null); };

  const handleAddTrip = async (newTrip: Trip) => {
    if (!user) return;
    try {
      const id = await createTrip(user.id, newTrip);
      setTrips(prev => [{ ...newTrip, id, events: [] }, ...prev]);
      setSelectedTripId(id);
    } catch (err: any) {
      toast({ title: t('toast.createError'), description: err.message, variant: 'destructive' });
    }
  };

  const handleUpdateTrip = async (updatedTrip: Trip) => {
    if (!user) return;
    setTrips(prev => prev.map(t => t.id === updatedTrip.id ? updatedTrip : t));
    try {
      await syncTripEvents(user.id, updatedTrip);
    } catch (err: any) {
      toast({ title: t('toast.updateError'), description: err.message, variant: 'destructive' });
      loadTrips();
    }
  };

  const handleDeleteTrip = async (tripId: string) => {
    try {
      await deleteTrip(tripId);
      setTrips(prev => prev.filter(t => t.id !== tripId));
      setSelectedTripId(null);
    } catch (err: any) {
      toast({ title: t('toast.deleteError'), description: err.message, variant: 'destructive' });
    }
  };

  const handleLogout = async () => { await signOut(); };
  const selectedTrip = trips.find(t => t.id === selectedTripId);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">{t('app.loadingTrips')}</p>
        </div>
      </div>
    );
  }

  if (selectedTrip) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <TripDetailView
          trip={selectedTrip}
          onBack={handleBackToDashboard}
          onUpdateTrip={handleUpdateTrip}
          onDeleteTrip={handleDeleteTrip}
        />
      </div>
    );
  }

  const renderView = () => {
    switch (activeView) {
      case 'dashboard':
        return (
          <DashboardHome
            trips={trips}
            onSelectTrip={handleSelectTrip}
            onAddTrip={() => setIsAddTripModalOpen(true)}
            displayName={displayName}
          />
        );
      case 'trips':
        return (
          <TripsGrid
            trips={trips}
            onSelectTrip={handleSelectTrip}
            onAddTrip={handleAddTrip}
          />
        );
      case 'activityBank':
        return <ActivityBank trips={trips} onUpdateTrip={handleUpdateTrip} />;
      case 'stats':
        return (
          <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto" dir={dir}>
            <h1 className="text-2xl sm:text-3xl font-bold font-display mb-6">{t('stats.title')}</h1>
            <StatsDashboard trips={trips} />
          </div>
        );
      case 'notifications':
        return <NotificationsView onSelectTrip={handleSelectTrip} />;
      case 'settings':
        return <SettingsView />;
      default:
        return null;
    }
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background text-foreground">
        <AppSidebar activeView={activeView} onViewChange={setActiveView} notificationCount={notificationCount} />
        <div className="flex-1 flex flex-col min-w-0">
          <TopBar onLogout={handleLogout} onSelectTrip={handleSelectTrip} trips={trips} />
          <main className="flex-1 overflow-auto">
            {renderView()}
          </main>
        </div>
      </div>
      <AddTripModal isOpen={isAddTripModalOpen} onClose={() => setIsAddTripModalOpen(false)} onAddTrip={handleAddTrip} />
    </SidebarProvider>
  );
};

export default Index;

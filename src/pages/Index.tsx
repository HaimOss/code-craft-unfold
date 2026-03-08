import React, { useState, useEffect } from 'react';
import { Trip, Event, User } from '@/types';
import TripDashboard from '@/components/trip/TripDashboard';
import TripDetailView from '@/components/trip/TripDetailView';
import { MOCK_TRIPS } from '@/constants';

const Index = () => {
  const [currentUser] = useState<User>({ email: 'guest@wonderjourney.com' });
  const [trips, setTrips] = useState<Trip[]>([]);
  const [unscheduledEvents, setUnscheduledEvents] = useState<Event[]>([]);
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);

  useEffect(() => {
    try {
      const storedTrips = localStorage.getItem(`trips_${currentUser.email}`);
      if (storedTrips) {
        setTrips(JSON.parse(storedTrips));
      } else {
        setTrips(MOCK_TRIPS);
      }
      const storedUnscheduled = localStorage.getItem(`unscheduledEvents_${currentUser.email}`);
      setUnscheduledEvents(storedUnscheduled ? JSON.parse(storedUnscheduled) : []);
    } catch {
      setTrips(MOCK_TRIPS);
      setUnscheduledEvents([]);
    }
  }, [currentUser]);

  useEffect(() => {
    localStorage.setItem(`trips_${currentUser.email}`, JSON.stringify(trips));
  }, [trips, currentUser]);

  useEffect(() => {
    localStorage.setItem(`unscheduledEvents_${currentUser.email}`, JSON.stringify(unscheduledEvents));
  }, [unscheduledEvents, currentUser]);

  const handleSelectTrip = (tripId: string) => setSelectedTripId(tripId);
  const handleBackToDashboard = () => setSelectedTripId(null);
  const handleUpdateTrip = (updatedTrip: Trip) => setTrips(prev => prev.map(t => t.id === updatedTrip.id ? updatedTrip : t));
  const handleDeleteTrip = (tripId: string) => { setTrips(prev => prev.filter(t => t.id !== tripId)); setSelectedTripId(null); };
  const handleAddTrip = (newTrip: Trip) => { setTrips(prev => [...prev, newTrip]); setSelectedTripId(newTrip.id); };
  const handleAddUnscheduledEvent = (event: Event) => setUnscheduledEvents(prev => [...prev, event]);

  const handleLogout = () => {
    if (window.confirm("This will reset the demo data. Are you sure?")) {
      localStorage.removeItem(`trips_${currentUser.email}`);
      localStorage.removeItem(`unscheduledEvents_${currentUser.email}`);
      window.location.reload();
    }
  };

  const selectedTrip = trips.find(t => t.id === selectedTripId);

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
          unscheduledEvents={unscheduledEvents}
          onAddUnscheduledEvent={handleAddUnscheduledEvent}
          onLogout={handleLogout}
        />
      )}
    </div>
  );
};

export default Index;

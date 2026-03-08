import { supabase } from '@/integrations/supabase/client';
import { Trip, Event, EventCategory, PaymentMethod, TripStatus } from '@/types';

// Convert DB row to Trip type
const dbRowToTrip = (row: any, events: any[]): Trip => ({
  id: row.id,
  name: row.name,
  destination: row.destination || undefined,
  start_date: row.start_date,
  end_date: row.end_date,
  base_currency: row.base_currency,
  status: row.status as TripStatus,
  cover_image: row.cover_image || undefined,
  album_link: row.album_link || undefined,
  dailyInfo: row.daily_info || {},
  budget: row.budget ? Number(row.budget) : undefined,
  events: events.map(dbRowToEvent),
});

const dbRowToEvent = (row: any): Event => ({
  id: row.id,
  date: row.date,
  time: row.time,
  endTime: row.end_time || undefined,
  category: row.category as EventCategory,
  title: row.title,
  amount: Number(row.amount),
  currency: row.currency,
  payment_method: row.payment_method as PaymentMethod,
  details: row.details || {},
  notes: row.notes || undefined,
  rating: row.rating || undefined,
});

export const fetchTrips = async (userId: string): Promise<Trip[]> => {
  const { data: trips, error: tripsError } = await supabase
    .from('trips')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (tripsError) throw tripsError;
  if (!trips || trips.length === 0) return [];

  const { data: events, error: eventsError } = await supabase
    .from('events')
    .select('*')
    .in('trip_id', trips.map(t => t.id))
    .order('sort_order', { ascending: true });

  if (eventsError) throw eventsError;

  return trips.map(trip =>
    dbRowToTrip(trip, (events || []).filter(e => e.trip_id === trip.id))
  );
};

export const createTrip = async (userId: string, trip: Omit<Trip, 'events'>): Promise<string> => {
  const { data, error } = await supabase
    .from('trips')
    .insert([{
      user_id: userId,
      name: trip.name,
      destination: trip.destination || null,
      start_date: trip.start_date,
      end_date: trip.end_date,
      base_currency: trip.base_currency,
      status: trip.status,
      cover_image: trip.cover_image || null,
      album_link: trip.album_link || null,
      daily_info: (trip.dailyInfo || {}) as any,
    }])
    .select('id')
    .single();

  if (error) throw error;
  return data.id;
};

export const updateTrip = async (trip: Trip) => {
  // Update trip metadata
  const { error: tripError } = await supabase
    .from('trips')
    .update({
      name: trip.name,
      destination: trip.destination || null,
      start_date: trip.start_date,
      end_date: trip.end_date,
      base_currency: trip.base_currency,
      status: trip.status,
      cover_image: trip.cover_image || null,
      album_link: trip.album_link || null,
      daily_info: (trip.dailyInfo || {}) as any,
      updated_at: new Date().toISOString(),
    })
    .eq('id', trip.id);

  if (tripError) throw tripError;
};

export const deleteTrip = async (tripId: string) => {
  const { error } = await supabase.from('trips').delete().eq('id', tripId);
  if (error) throw error;
};

export const upsertEvent = async (userId: string, tripId: string, event: Event, sortOrder: number) => {
  const { error } = await supabase
    .from('events')
    .upsert([{
      id: event.id,
      trip_id: tripId,
      user_id: userId,
      date: event.date,
      time: event.time,
      end_time: event.endTime || null,
      category: event.category,
      title: event.title,
      amount: event.amount,
      currency: event.currency,
      payment_method: event.payment_method,
      details: event.details as any,
      notes: event.notes || null,
      rating: event.rating || null,
      sort_order: sortOrder,
    }]);

  if (error) throw error;
};

export const deleteEvent = async (eventId: string) => {
  const { error } = await supabase.from('events').delete().eq('id', eventId);
  if (error) throw error;
};

export const syncTripEvents = async (userId: string, trip: Trip) => {
  // Update trip metadata
  await updateTrip(trip);

  // Get existing events for this trip
  const { data: existingEvents } = await supabase
    .from('events')
    .select('id')
    .eq('trip_id', trip.id);

  const existingIds = new Set((existingEvents || []).map(e => e.id));
  const currentIds = new Set(trip.events.map(e => e.id));

  // Delete removed events
  const toDelete = [...existingIds].filter(id => !currentIds.has(id));
  if (toDelete.length > 0) {
    await supabase.from('events').delete().in('id', toDelete);
  }

  // Upsert all current events
  for (let i = 0; i < trip.events.length; i++) {
    await upsertEvent(userId, trip.id, trip.events[i], i);
  }
};

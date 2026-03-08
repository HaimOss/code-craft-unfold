import { supabase } from '@/integrations/supabase/client';
import { Trip, Event, TripStatus, EventCategory, PaymentMethod } from '@/types';
import { createTrip, upsertEvent } from './tripService';

interface SharedPayload {
  version: 1;
  type: 'trip' | 'event';
  exportedAt: string;
  data: Trip | Event;
}

// ─── Share Link ───

export const createShareLink = async (
  userId: string,
  itemType: 'trip' | 'event',
  itemData: Trip | Event
): Promise<string> => {
  // Strip IDs so imported copy gets fresh ones
  const cleanData = JSON.parse(JSON.stringify(itemData));

  const { data, error } = await supabase
    .from('shared_items')
    .insert([{
      user_id: userId,
      item_type: itemType,
      item_data: cleanData as any,
    }])
    .select('share_token')
    .single();

  if (error) throw error;
  return data.share_token;
};

export const getSharedItem = async (token: string): Promise<{ itemType: string; itemData: any } | null> => {
  const { data, error } = await supabase
    .rpc('get_shared_item_by_token', { _token: token });

  if (error || !data || data.length === 0) return null;

  const item = data[0];

  // Check expiry
  if (item.expires_at && new Date(item.expires_at) < new Date()) return null;

  return { itemType: item.item_type, itemData: item.item_data };
};

export const importSharedTrip = async (userId: string, tripData: any): Promise<string> => {
  const trip: Omit<Trip, 'events'> = {
    id: crypto.randomUUID(),
    name: tripData.name + ' (imported)',
    destination: tripData.destination,
    start_date: tripData.start_date,
    end_date: tripData.end_date,
    base_currency: tripData.base_currency || 'ILS',
    status: (tripData.status as TripStatus) || TripStatus.Planning,
    cover_image: tripData.cover_image,
    album_link: tripData.album_link,
    dailyInfo: tripData.dailyInfo,
  };

  const newTripId = await createTrip(userId, trip);

  const events = tripData.events || [];
  for (let i = 0; i < events.length; i++) {
    const ev = events[i];
    const newEvent: Event = {
      ...ev,
      id: crypto.randomUUID(),
    };
    await upsertEvent(userId, newTripId, newEvent, i);
  }

  return newTripId;
};

export const importSharedEvent = async (userId: string, tripId: string, eventData: any, sortOrder: number): Promise<void> => {
  const newEvent: Event = {
    ...eventData,
    id: crypto.randomUUID(),
  };
  await upsertEvent(userId, tripId, newEvent, sortOrder);
};

// ─── JSON Export / Import ───

export const exportTripToJSON = (trip: Trip): void => {
  const payload: SharedPayload = {
    version: 1,
    type: 'trip',
    exportedAt: new Date().toISOString(),
    data: trip,
  };
  downloadJSON(payload, `trip-${trip.name.replace(/\s+/g, '-')}.json`);
};

export const exportEventToJSON = (event: Event): void => {
  const payload: SharedPayload = {
    version: 1,
    type: 'event',
    exportedAt: new Date().toISOString(),
    data: event,
  };
  downloadJSON(payload, `event-${event.title.replace(/\s+/g, '-')}.json`);
};

export const parseImportFile = (file: File): Promise<SharedPayload> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parsed = JSON.parse(e.target?.result as string);
        if (!parsed.version || !parsed.type || !parsed.data) {
          reject(new Error('קובץ לא תקין'));
          return;
        }
        resolve(parsed as SharedPayload);
      } catch {
        reject(new Error('קובץ JSON לא תקין'));
      }
    };
    reader.onerror = () => reject(new Error('שגיאה בקריאת הקובץ'));
    reader.readAsText(file);
  });
};

function downloadJSON(data: any, filename: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

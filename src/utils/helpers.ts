import { Event, EventCategory } from '../types';

const firstNonEmpty = (d: Record<string, unknown>, keys: string[]): string | null => {
  for (const k of keys) {
    const v = d[k];
    if (typeof v === 'string' && v.trim()) return v.trim();
  }
  return null;
};

export const getLocationFromEvent = (event: Event): string | null => {
  if (!event.details) return null;
  const d = event.details as Record<string, unknown>;
  switch (event.category) {
    case EventCategory.Flights:
      return firstNonEmpty(d, ['arr_airport', 'dept_airport', 'address', 'location']);
    case EventCategory.Accommodation:
      return firstNonEmpty(d, ['address', 'location']);
    case EventCategory.Transport:
      return firstNonEmpty(d, ['dropoff_point', 'pickup_point', 'address', 'location']);
    case EventCategory.Activity:
    case EventCategory.Food:
    case EventCategory.Shopping:
    case EventCategory.General:
    default:
      return firstNonEmpty(d, ['address', 'location']);
  }
};

export const toLocalYYYYMMDD = (date: Date): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

export const generateId = () => {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).substring(2, 15);
};

export const resizeImage = async (file: File, maxWidth: number, maxHeight: number): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.src = reader.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.9));
      };
      img.onerror = reject;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

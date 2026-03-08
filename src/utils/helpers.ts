import { Event, EventCategory, FlightDetails, AccommodationDetails, TransportDetails, GeneralDetails } from '../types';

export const getLocationFromEvent = (event: Event): string | null => {
  const details = event.details;
  if (!details) return null;
  switch (event.category) {
    case EventCategory.Flights:
      return (details as FlightDetails)?.arr_airport || (details as FlightDetails)?.dept_airport || null;
    case EventCategory.Accommodation:
      return (details as AccommodationDetails)?.address || null;
    case EventCategory.Transport:
      return (details as TransportDetails)?.dropoff_point || (details as TransportDetails)?.pickup_point || null;
    case EventCategory.Activity:
    case EventCategory.Food:
    case EventCategory.Shopping:
    case EventCategory.General:
      return (details as GeneralDetails)?.location || null;
    default:
      return null;
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

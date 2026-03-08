export interface User {
  email: string;
  profilePicture?: string;
}

export enum TripStatus {
  Idea = "Idea 💡",
  Planning = "Planning 📝",
  Booked = "Booked ✈️",
  Completed = "Completed ✅",
}

export enum EventCategory {
  Flights = "Flights ✈️",
  Accommodation = "Accommodation 🏨",
  Transport = "Transport 🚗",
  Activity = "Activity 🎭",
  Food = "Food 🍽️",
  Shopping = "Shopping 🛍️",
  General = "General 📌",
}

export enum PaymentMethod {
  Credit = "Credit",
  Debit = "Debit",
  Cash = "Cash",
  Other = "Other",
}

export interface FlightDetails {
  flight_num?: string;
  dept_airport?: string;
  arr_airport?: string;
}

export interface AccommodationDetails {
  check_in?: string;
  check_out?: string;
  address?: string;
  book_link?: string;
  phone?: string;
  website?: string;
  opening_hours?: string;
}

export interface TransportDetails {
  pickup_point?: string;
  dropoff_point?: string;
}

export interface GeneralDetails {
  location?: string;
  phone?: string;
  website?: string;
  opening_hours?: string;
}

export type EventDetails = FlightDetails | AccommodationDetails | TransportDetails | GeneralDetails;

export interface Event {
  id: string;
  date: string;
  time: string;
  endTime?: string;
  category: EventCategory;
  title: string;
  amount: number;
  currency: string;
  payment_method: PaymentMethod;
  details: EventDetails;
  notes?: string;
  rating?: number;
}

export interface DailyInfo {
  startPoint?: string;
  endPoint?: string;
}

export interface Trip {
  id: string;
  name: string;
  destination?: string;
  start_date: string;
  end_date: string;
  base_currency: string;
  status: TripStatus;
  events: Event[];
  cover_image?: string;
  album_link?: string;
  dailyInfo?: { [date: string]: DailyInfo };
  budget?: number;
}

export interface TripCollaborator {
  id: string;
  trip_id: string;
  user_id?: string;
  invited_email?: string;
  invite_token: string;
  role: 'editor' | 'viewer';
  status: 'pending' | 'accepted' | 'declined';
  created_at: string;
}

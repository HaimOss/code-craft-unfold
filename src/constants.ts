import { Trip, TripStatus, EventCategory, PaymentMethod } from './types';

export const CURRENCIES = ["ILS", "USD", "EUR", "GBP", "JPY", "THB", "CHF"];
export const TRIP_STATUSES = Object.values(TripStatus);
export const EVENT_CATEGORIES = Object.values(EventCategory);
export const PAYMENT_METHODS = Object.values(PaymentMethod);

export const CURRENCY_SYMBOLS: { [key: string]: string } = {
  ILS: '₪', USD: '$', EUR: '€', GBP: '£', JPY: '¥', THB: '฿', CHF: 'Fr',
};

export const CATEGORY_ICONS: { [key in EventCategory]: string } = {
  [EventCategory.Flights]: '✈️',
  [EventCategory.Accommodation]: '🛏️',
  [EventCategory.Transport]: '🚗',
  [EventCategory.Activity]: '🎭',
  [EventCategory.Food]: '🍽️',
  [EventCategory.Shopping]: '🛍️',
  [EventCategory.General]: '📌',
};

export const CATEGORY_DISPLAY_CONFIG: { [key: string]: { name: string; icon: string; color: string; bgColor: string; borderColor: string } } = {
  [EventCategory.Accommodation]: {
    name: 'Stays', icon: '🛏️',
    color: 'text-purple-700 dark:text-purple-300',
    bgColor: 'bg-purple-50 dark:bg-purple-900/50',
    borderColor: 'border-purple-200 dark:border-purple-800',
  },
  [EventCategory.Food]: {
    name: 'Meals', icon: '🍽️',
    color: 'text-orange-700 dark:text-orange-300',
    bgColor: 'bg-orange-50 dark:bg-orange-900/50',
    borderColor: 'border-orange-200 dark:border-orange-800',
  },
  [EventCategory.Activity]: {
    name: 'Activities', icon: '🎡',
    color: 'text-blue-700 dark:text-blue-300',
    bgColor: 'bg-blue-50 dark:bg-blue-900/50',
    borderColor: 'border-blue-200 dark:border-blue-800',
  },
  [EventCategory.Shopping]: {
    name: 'Shopping', icon: '🛍️',
    color: 'text-pink-700 dark:text-pink-300',
    bgColor: 'bg-pink-50 dark:bg-pink-900/50',
    borderColor: 'border-pink-200 dark:border-pink-800',
  },
  [EventCategory.Transport]: {
    name: 'Transport', icon: '🚗',
    color: 'text-teal-700 dark:text-teal-300',
    bgColor: 'bg-teal-50 dark:bg-teal-900/50',
    borderColor: 'border-teal-200 dark:border-teal-800',
  },
  [EventCategory.Flights]: {
    name: 'Flights', icon: '✈️',
    color: 'text-sky-700 dark:text-sky-300',
    bgColor: 'bg-sky-50 dark:bg-sky-900/50',
    borderColor: 'border-sky-200 dark:border-sky-800',
  },
  [EventCategory.General]: {
    name: 'General', icon: '📌',
    color: 'text-gray-700 dark:text-gray-300',
    bgColor: 'bg-gray-100 dark:bg-gray-700',
    borderColor: 'border-gray-200 dark:border-gray-600',
  },
};

export const MOCK_TRIPS: Trip[] = [
  {
    id: '1',
    name: 'Italian Renaissance & Espresso',
    destination: 'Rome & Florence, Italy',
    start_date: '2024-05-10',
    end_date: '2024-05-15',
    base_currency: 'EUR',
    status: TripStatus.Booked,
    cover_image: 'https://images.unsplash.com/photo-1552832230-c0197dd311b5?auto=format&fit=crop&w=800&q=80',
    album_link: 'https://photos.google.com/share/demo-italy',
    dailyInfo: {
      '2024-05-10': { startPoint: 'Fiumicino Airport', endPoint: 'Hotel Artemide' },
      '2024-05-11': { startPoint: 'Hotel Artemide', endPoint: 'Trastevere' },
    },
    events: [
      {
        id: 'it1', date: '2024-05-10', time: '14:30', category: EventCategory.Flights,
        title: 'Arrival in Rome', amount: 450, currency: 'EUR',
        payment_method: PaymentMethod.Credit,
        details: { flight_num: 'AZ204', dept_airport: 'LHR', arr_airport: 'FCO' },
        notes: 'Take the Leonardo Express train to the city center.',
      },
      {
        id: 'it2', date: '2024-05-10', time: '16:00', category: EventCategory.Accommodation,
        title: 'Check-in: Hotel Artemide', amount: 1200, currency: 'EUR',
        payment_method: PaymentMethod.Credit,
        details: { check_in: '15:00', check_out: '11:00', address: 'Via Nazionale, 22, Rome', website: 'https://www.hotelartemide.it' },
        rating: 5, notes: 'Room with balcony requested.',
      },
      {
        id: 'it3', date: '2024-05-11', time: '09:00', category: EventCategory.Activity,
        title: 'Colosseum & Roman Forum Tour', amount: 85, currency: 'EUR',
        payment_method: PaymentMethod.Credit,
        details: { location: 'Piazza del Colosseo, 1, Rome' },
        notes: 'Skip-the-line tickets booked via Viator.',
      },
      {
        id: 'it4', date: '2024-05-11', time: '13:00', category: EventCategory.Food,
        title: 'Lunch at Roscioli Salumeria', amount: 120, currency: 'EUR',
        payment_method: PaymentMethod.Cash,
        details: { location: 'Via dei Giubbonari, 21, Rome', phone: '+39 06 687 5287' },
        rating: 5, notes: 'Best Carbonara in Rome. Must try the Burrata.',
      },
      {
        id: 'it5', date: '2024-05-12', time: '10:00', category: EventCategory.Transport,
        title: 'Train to Florence', amount: 55, currency: 'EUR',
        payment_method: PaymentMethod.Credit,
        details: { pickup_point: 'Roma Termini', dropoff_point: 'Firenze Santa Maria Novella' },
        notes: 'Frecciarossa 9520. Seat 4A, 4B.',
      },
      {
        id: 'it6', date: '2024-05-13', time: '11:00', category: EventCategory.Activity,
        title: 'Uffizi Gallery', amount: 40, currency: 'EUR',
        payment_method: PaymentMethod.Credit,
        details: { location: 'Piazzale degli Uffizi, 6, Florence' },
        notes: "Focus on Botticelli's Birth of Venus.",
      },
    ],
  },
  {
    id: '2',
    name: 'Autumn in Japan',
    destination: 'Tokyo & Kyoto, Japan',
    start_date: '2024-11-10',
    end_date: '2024-11-20',
    base_currency: 'USD',
    status: TripStatus.Planning,
    cover_image: 'https://images.unsplash.com/photo-1542051841857-5f90071e7989?auto=format&fit=crop&w=800&q=80',
    events: [
      {
        id: 'jp1', date: '2024-11-10', time: '18:00', category: EventCategory.Flights,
        title: 'Landing in Tokyo', amount: 1200, currency: 'USD',
        payment_method: PaymentMethod.Credit,
        details: { flight_num: 'JL005', dept_airport: 'JFK', arr_airport: 'HND' },
      },
      {
        id: 'jp2', date: '2024-11-10', time: '20:30', category: EventCategory.Accommodation,
        title: 'Keio Plaza Hotel Tokyo', amount: 350000, currency: 'JPY',
        payment_method: PaymentMethod.Credit,
        details: { check_in: '14:00', address: '2-2-1 Nishi-Shinjuku, Tokyo', website: 'https://www.keioplaza.com' },
        rating: 4,
      },
      {
        id: 'jp3', date: '2024-11-11', time: '09:00', category: EventCategory.Activity,
        title: 'TeamLab Planets', amount: 3800, currency: 'JPY',
        payment_method: PaymentMethod.Credit,
        details: { location: 'Toyosu, Tokyo' },
        notes: 'Wear shorts that can be rolled up (water area).',
      },
    ],
  },
  {
    id: '3',
    name: 'Tropical Thailand Escape',
    destination: 'Bangkok & Krabi, Thailand',
    start_date: '2025-01-15',
    end_date: '2025-01-25',
    base_currency: 'ILS',
    status: TripStatus.Idea,
    cover_image: 'https://images.unsplash.com/photo-1552465011-b4e21bf6e79a?auto=format&fit=crop&w=800&q=80',
    events: [
      {
        id: 'th1', date: '2025-01-15', time: '12:00', category: EventCategory.Transport,
        title: 'Private Transfer to Hotel', amount: 1500, currency: 'THB',
        payment_method: PaymentMethod.Cash,
        details: { pickup_point: 'BKK Airport', dropoff_point: 'Rambuttri Village Inn' },
        notes: 'Driver meeting at Gate 3.',
      },
      {
        id: 'th2', date: '2025-01-15', time: '19:00', category: EventCategory.Food,
        title: 'Street Food at Jay Fai', amount: 2000, currency: 'THB',
        payment_method: PaymentMethod.Cash,
        details: { location: '327 Mahachai Road, Bangkok' },
        notes: 'Michelin star street food. Famous for Crab Omelet.',
      },
      {
        id: 'th3', date: '2025-01-16', time: '09:00', category: EventCategory.Activity,
        title: 'Wat Arun & Grand Palace', amount: 500, currency: 'THB',
        payment_method: PaymentMethod.Cash,
        details: { location: 'Bangkok Old City' },
        notes: 'Dress code: No shorts or sleeveless shirts.',
      },
    ],
  },
];

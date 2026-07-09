import * as XLSX from 'xlsx';
import { Trip, Event, EventCategory, PaymentMethod, TripStatus, EventDetails } from '@/types';
import { CURRENCIES, TRIP_STATUSES, EVENT_CATEGORIES, PAYMENT_METHODS } from '@/constants';

const TRIP_HEADERS = ['name', 'destination', 'start_date', 'end_date', 'base_currency', 'status', 'budget', 'cover_image', 'album_link'];
const EVENT_HEADERS = ['date', 'time', 'end_time', 'category', 'title', 'amount', 'currency', 'payment_method', 'address', 'location', 'notes', 'tags'];

export interface ParsedTripResult {
  trip: Omit<Trip, 'id' | 'events'>;
  events: Event[];
  errors: string[];
  warnings: string[];
}

const today = () => new Date().toISOString().slice(0, 10);

export const downloadTripTemplate = () => {
  const wb = XLSX.utils.book_new();

  // Trip sheet
  const tripExample = [
    TRIP_HEADERS,
    ['חופשה ברומא', 'רומא, איטליה', '2026-05-10', '2026-05-14', 'EUR', TripStatus.Planning, 2000, '', ''],
  ];
  const tripSheet = XLSX.utils.aoa_to_sheet(tripExample);
  tripSheet['!cols'] = TRIP_HEADERS.map(() => ({ wch: 18 }));
  XLSX.utils.book_append_sheet(wb, tripSheet, 'Trip');

  // Events sheet
  const eventsExample = [
    EVENT_HEADERS,
    ['2026-05-10', '06:00', '10:30', EventCategory.Flights, 'טיסה לרומא', 350, 'EUR', PaymentMethod.Credit, '', 'TLV → FCO', 'טיסה ישירה', 'חובה'],
    ['2026-05-10', '14:00', '', EventCategory.Accommodation, 'מלון ליד הקולוסיאום', 120, 'EUR', PaymentMethod.Credit, 'Via dei Fori Imperiali 25, Rome', '', '3 לילות', ''],
    ['2026-05-11', '09:00', '12:00', EventCategory.Activity, 'סיור בקולוסיאום', 25, 'EUR', PaymentMethod.Credit, 'Piazza del Colosseo, 1, Rome', '', 'להזמין מראש', 'מומלץ,חובה'],
    ['2026-05-11', '13:00', '14:00', EventCategory.Food, 'פיצה אמיתית', 18, 'EUR', PaymentMethod.Cash, 'Pizzeria Da Baffetto, Rome', '', '', ''],
  ];
  const eventsSheet = XLSX.utils.aoa_to_sheet(eventsExample);
  eventsSheet['!cols'] = EVENT_HEADERS.map(() => ({ wch: 18 }));
  XLSX.utils.book_append_sheet(wb, eventsSheet, 'Events');

  // Instructions sheet
  const instr: any[][] = [
    ['הוראות מילוי'],
    [],
    ['גיליון Trip'],
    ['- name (חובה): שם הטיול'],
    ['- destination: יעד (טקסט חופשי)'],
    ['- start_date / end_date (חובה): פורמט YYYY-MM-DD, למשל 2026-05-10'],
    ['- base_currency (חובה): קוד מטבע מהרשימה למטה'],
    ['- status: אחד מהערכים ברשימה למטה'],
    ['- budget: מספר (אופציונלי)'],
    ['- cover_image / album_link: URL (אופציונלי)'],
    [],
    ['גיליון Events'],
    ['- date (חובה): YYYY-MM-DD, חייב להיות בטווח הטיול'],
    ['- time (חובה): HH:MM (24 שעות)'],
    ['- end_time: HH:MM (אופציונלי)'],
    ['- category (חובה): אחד מהערכים ברשימה למטה'],
    ['- title (חובה): כותרת האירוע'],
    ['- amount (חובה): מספר; 0 אם אין עלות'],
    ['- currency (חובה): קוד מטבע'],
    ['- payment_method (חובה): Credit / Debit / Cash / Other'],
    ['- address: כתובת מדויקת'],
    ['- location: אזור / מיקום כללי'],
    ['- notes: הערות חופשיות'],
    ['- tags: תגיות מופרדות בפסיק, למשל "מומלץ,חובה"'],
    [],
    ['סטטוסים אפשריים לטיול'],
    ...TRIP_STATUSES.map(s => [s]),
    [],
    ['קטגוריות אפשריות לאירוע'],
    ...EVENT_CATEGORIES.map(c => [c]),
    [],
    ['שיטות תשלום'],
    ...PAYMENT_METHODS.map(p => [p]),
    [],
    ['מטבעות נתמכים'],
    [CURRENCIES.join(', ')],
  ];
  const instrSheet = XLSX.utils.aoa_to_sheet(instr);
  instrSheet['!cols'] = [{ wch: 60 }];
  XLSX.utils.book_append_sheet(wb, instrSheet, 'Instructions');

  XLSX.writeFile(wb, `trip-template-${today()}.xlsx`);
};

const normalizeDate = (v: any): string => {
  if (v == null || v === '') return '';
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (typeof v === 'number') {
    // Excel serial date
    const parsed = XLSX.SSF.parse_date_code(v);
    if (parsed) {
      const mm = String(parsed.m).padStart(2, '0');
      const dd = String(parsed.d).padStart(2, '0');
      return `${parsed.y}-${mm}-${dd}`;
    }
  }
  const s = String(v).trim();
  const m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;
  const d = new Date(s);
  if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  return s;
};

const normalizeTime = (v: any): string => {
  if (v == null || v === '') return '';
  if (typeof v === 'number') {
    // Excel time fraction
    const totalMin = Math.round(v * 24 * 60);
    const h = String(Math.floor(totalMin / 60) % 24).padStart(2, '0');
    const m = String(totalMin % 60).padStart(2, '0');
    return `${h}:${m}`;
  }
  const s = String(v).trim();
  const m = s.match(/^(\d{1,2}):(\d{2})/);
  if (m) return `${m[1].padStart(2, '0')}:${m[2]}`;
  return s;
};

const matchEnum = <T extends string>(v: any, allowed: readonly T[]): T | null => {
  if (v == null) return null;
  const s = String(v).trim();
  if (!s) return null;
  const exact = allowed.find(a => a === s);
  if (exact) return exact;
  // match by prefix / case-insensitive core word
  const lower = s.toLowerCase();
  const found = allowed.find(a => a.toLowerCase().startsWith(lower) || lower.startsWith(a.toLowerCase().split(' ')[0]));
  return found || null;
};

const rowToObject = (headers: string[], row: any[]): Record<string, any> => {
  const obj: Record<string, any> = {};
  headers.forEach((h, i) => { obj[h] = row[i]; });
  return obj;
};

export const parseTripExcel = async (file: File): Promise<ParsedTripResult> => {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: 'array', cellDates: true });
  const errors: string[] = [];
  const warnings: string[] = [];

  const tripSheetName = wb.SheetNames.find(n => n.toLowerCase() === 'trip');
  const eventsSheetName = wb.SheetNames.find(n => n.toLowerCase() === 'events');
  if (!tripSheetName) throw new Error('לא נמצא גיליון בשם "Trip"');
  if (!eventsSheetName) throw new Error('לא נמצא גיליון בשם "Events"');

  const tripRows = XLSX.utils.sheet_to_json<any[]>(wb.Sheets[tripSheetName], { header: 1, raw: true, defval: '' });
  const eventRows = XLSX.utils.sheet_to_json<any[]>(wb.Sheets[eventsSheetName], { header: 1, raw: true, defval: '' });

  if (tripRows.length < 2) throw new Error('גיליון Trip ריק. יש למלא שורת נתונים אחת.');
  const tripHeaders = (tripRows[0] as any[]).map(h => String(h).trim().toLowerCase());
  const tripData = rowToObject(tripHeaders, tripRows[1] as any[]);

  const name = String(tripData.name || '').trim();
  const start_date = normalizeDate(tripData.start_date);
  const end_date = normalizeDate(tripData.end_date);
  const base_currency = String(tripData.base_currency || '').trim().toUpperCase();

  if (!name) errors.push('שם הטיול חסר (Trip.name)');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(start_date)) errors.push('תאריך התחלה לא תקין (Trip.start_date)');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(end_date)) errors.push('תאריך סיום לא תקין (Trip.end_date)');
  if (!base_currency || !CURRENCIES.includes(base_currency)) errors.push(`מטבע בסיס לא תקין (Trip.base_currency). נתמכים: ${CURRENCIES.slice(0, 8).join(', ')}...`);

  const status = matchEnum(tripData.status, TRIP_STATUSES) || TripStatus.Planning;
  const budget = tripData.budget !== '' && !isNaN(Number(tripData.budget)) ? Number(tripData.budget) : undefined;

  const trip: Omit<Trip, 'id' | 'events'> = {
    name,
    destination: String(tripData.destination || '').trim() || undefined,
    start_date,
    end_date,
    base_currency,
    status,
    budget,
    cover_image: String(tripData.cover_image || '').trim() || undefined,
    album_link: String(tripData.album_link || '').trim() || undefined,
  };

  // Events
  const events: Event[] = [];
  if (eventRows.length < 2) {
    warnings.push('גיליון Events ריק — הטיול ייווצר ללא אירועים.');
  } else {
    const eventHeaders = (eventRows[0] as any[]).map(h => String(h).trim().toLowerCase());
    for (let i = 1; i < eventRows.length; i++) {
      const raw = eventRows[i] as any[];
      if (!raw || raw.every(c => c === '' || c == null)) continue;
      const r = rowToObject(eventHeaders, raw);
      const rowNum = i + 1;

      const eDate = normalizeDate(r.date);
      const eTime = normalizeTime(r.time);
      const eEnd = normalizeTime(r.end_time);
      const title = String(r.title || '').trim();
      const amountRaw = r.amount;
      const amount = amountRaw === '' || amountRaw == null ? 0 : Number(amountRaw);
      const currency = String(r.currency || base_currency).trim().toUpperCase();
      const category = matchEnum(r.category, EVENT_CATEGORIES);
      const payment = matchEnum(r.payment_method, PAYMENT_METHODS) || PaymentMethod.Credit;

      if (!eDate || !/^\d{4}-\d{2}-\d{2}$/.test(eDate)) { warnings.push(`שורה ${rowNum}: תאריך לא תקין — דילוג`); continue; }
      if (!eTime || !/^\d{2}:\d{2}$/.test(eTime)) { warnings.push(`שורה ${rowNum}: שעה לא תקינה — דילוג`); continue; }
      if (!title) { warnings.push(`שורה ${rowNum}: כותרת חסרה — דילוג`); continue; }
      if (!category) { warnings.push(`שורה ${rowNum}: קטגוריה לא תקינה — דילוג`); continue; }
      if (isNaN(amount)) { warnings.push(`שורה ${rowNum}: סכום לא תקין — דילוג`); continue; }
      if (start_date && end_date && (eDate < start_date || eDate > end_date)) {
        warnings.push(`שורה ${rowNum}: התאריך ${eDate} מחוץ לטווח הטיול`);
      }

      const details: EventDetails = {} as any;
      const address = String(r.address || '').trim();
      const location = String(r.location || '').trim();
      if (address) (details as any).address = address;
      if (location) (details as any).location = location;

      const tags = String(r.tags || '').split(',').map(s => s.trim()).filter(Boolean);

      events.push({
        id: crypto.randomUUID(),
        date: eDate,
        time: eTime,
        endTime: eEnd || undefined,
        category,
        title,
        amount,
        currency,
        payment_method: payment,
        details,
        notes: String(r.notes || '').trim() || undefined,
        tags: tags.length ? tags : undefined,
      });
    }
  }

  return { trip, events, errors, warnings };
};

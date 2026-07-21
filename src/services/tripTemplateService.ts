import * as XLSX from 'xlsx';
import { Trip, Event, EventCategory, PaymentMethod, TripStatus, EventDetails, DailyInfo } from '@/types';
import { CURRENCIES, TRIP_STATUSES, EVENT_CATEGORIES, PAYMENT_METHODS } from '@/constants';
import { getLocationFromEvent } from '@/utils/helpers';

const TRIP_HEADERS = ['name', 'destination', 'start_date', 'end_date', 'base_currency', 'status', 'budget', 'cover_image', 'album_link'];
const EVENT_HEADERS = ['date', 'time', 'end_time', 'category', 'title', 'amount', 'currency', 'payment_method', 'address', 'location', 'website', 'phone', 'opening_hours', 'confirmation_num', 'book_link', 'notes', 'tags'];
const DAILY_INFO_HEADERS = ['date', 'start_point', 'end_point'];

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
    // Day 1 — start of day (flight from home)
    ['2026-05-10', '06:00', '10:30', EventCategory.Flights, 'טיסה לרומא — תחילת יום', 350, 'EUR', PaymentMethod.Credit, 'Ben Gurion Airport, Terminal 3, Israel', 'TLV → FCO (Fiumicino)', 'https://www.italiatrasporto.it', '', '', 'AZ801-XYZ', 'https://checkin.ita-airways.com', 'טיסה ישירה — צ׳ק אין 3 שעות לפני', 'חובה,תחילת-יום'],
    // Day 1 — end of day (check-in at accommodation)
    ['2026-05-10', '14:00', '', EventCategory.Accommodation, 'צ׳ק אין — מלון ליד הקולוסיאום — סוף יום', 120, 'EUR', PaymentMethod.Credit, 'Via dei Fori Imperiali 25, 00184 Roma RM, Italy', 'Rione Monti, Rome', 'https://hotelfoiromani.com', '+39 06 1234 5678', 'Check-in 14:00, Check-out 11:00', 'HTL-9F2K1', 'https://booking.com/hotel/xyz', '3 לילות — לינה עד 13/05', 'סוף-יום,לינה'],
    ['2026-05-11', '09:00', '12:00', EventCategory.Activity, 'סיור בקולוסיאום', 25, 'EUR', PaymentMethod.Credit, 'Piazza del Colosseo, 1, 00184 Roma RM, Italy', '', 'https://colosseo.it', '+39 06 3996 7700', 'Mon-Sun 08:30-19:15', 'COL-2026-4421', 'https://ticket.colosseo.it/xyz', 'להזמין מראש — לא לשכוח מים', 'מומלץ,חובה'],
    ['2026-05-11', '13:00', '14:00', EventCategory.Food, 'פיצה בבאפטו', 18, 'EUR', PaymentMethod.Cash, 'Via del Governo Vecchio, 114, 00186 Roma RM, Italy', '', 'https://pizzeriabaffetto.it', '+39 06 686 1617', 'Daily 12:00-15:30, 18:30-01:00', '', '', 'הכי טוב ברומא', ''],
  ];
  const eventsSheet = XLSX.utils.aoa_to_sheet(eventsExample);
  eventsSheet['!cols'] = EVENT_HEADERS.map(() => ({ wch: 18 }));
  XLSX.utils.book_append_sheet(wb, eventsSheet, 'Events');

  // DailyInfo sheet — one row per day with geocodable start/end points
  const hotel = 'Hotel Foro Romani, Via dei Fori Imperiali 25, 00184 Roma RM, Italy';
  const dailyInfoExample = [
    DAILY_INFO_HEADERS,
    ['2026-05-10', 'Ben Gurion Airport (TLV), Terminal 3, Israel', hotel],
    ['2026-05-11', hotel, hotel],
    ['2026-05-12', hotel, hotel],
    ['2026-05-13', hotel, hotel],
    ['2026-05-14', hotel, 'Fiumicino Airport (FCO), Terminal 3, 00054 Fiumicino RM, Italy'],
  ];
  const dailyInfoSheet = XLSX.utils.aoa_to_sheet(dailyInfoExample);
  dailyInfoSheet['!cols'] = [{ wch: 12 }, { wch: 60 }, { wch: 60 }];
  XLSX.utils.book_append_sheet(wb, dailyInfoSheet, 'DailyInfo');

  // Instructions sheet — geared towards AI-assisted filling
  const instr: any[][] = [
    ['📘 הוראות מילוי — קובץ תבנית טיול'],
    ['הקובץ מכיל 4 גיליונות עיקריים: Trip, Events, DailyInfo, Instructions (+ גיליון AI Prompt מוכן להעתקה).'],
    ['הקובץ מיועד לרוב להיות ממולא בעזרת AI (ChatGPT / Claude / Gemini). ראו גיליון "AI Prompt" — העתיקו משם את ה-Prompt המלא ל-AI לפני שתבקשו לבנות טיול.'],
    [],
    ['⚠️ כללי זהב'],
    ['1. לכל יום בטיול חובה שיהיה אירוע ראשון (תחילת יום) ואירוע אחרון (סיום יום). זה מאפשר לאפליקציה לחשב טיימליין נכון ולהציג מפה יומית.'],
    ['   • תחילת יום = איפה מתחילים את הבוקר (מלון, שדה תעופה, תחנת רכבת). סמן ב-tag "תחילת-יום".'],
    ['   • סיום יום = איפה ישנים / חוזרים בסוף היום (מלון, טיסה חזרה). סמן ב-tag "סוף-יום".'],
    ['   • אם ישנים באותו מלון כמה לילות — חזור על אירוע Accommodation קצר בכל בוקר כתחילת יום ("יציאה מהמלון").'],
    ['2. שדה address חייב להיות כתובת מלאה שגוגל מפות יודע לפתוח בלחיצה אחת:'],
    ['   • פורמט: "שם המקום, רחוב + מספר, מיקוד, עיר, מדינה"'],
    ['   • ✅ טוב:  "Colosseum, Piazza del Colosseo 1, 00184 Roma RM, Italy"'],
    ['   • ❌ רע:   "קולוסיאום" / "ברומא" / "ליד הכיכר"'],
    ['   • לשדה תעופה — כלול קוד IATA + טרמינל: "Ben Gurion Airport (TLV), Terminal 3, Israel"'],
    ['3. מלא כמה שיותר metadata — כל שדה שיודעים אותו. זה מייצר טיול עשיר עם קישורים, שעות פתיחה, טלפונים ומספרי אישור:'],
    ['   • website — אתר רשמי (URL מלא כולל https://)'],
    ['   • phone — טלפון בפורמט בינלאומי, למשל +39 06 3996 7700'],
    ['   • opening_hours — שעות פעילות, למשל "Mon-Sun 08:30-19:15"'],
    ['   • confirmation_num — מספר הזמנה / אישור מהספק'],
    ['   • book_link — קישור ישיר להזמנה / כרטיס / צ׳ק אין'],
    ['4. בסדר האירועים ביום — לפי שעה עולה (time). end_time אופציונלי אבל מומלץ מאוד לפעילויות ולטיסות.'],
    ['5. הימנע מכפילויות — כל אירוע חייב להיות ייחודי בשילוב תאריך+שעה+כותרת.'],
    [],
    ['🗺️ גיליון DailyInfo — נקודת התחלה וסיום לכל יום (חשוב מאוד!)'],
    ['גיליון זה שולט על הסמן הירוק (התחלה) והאדום (סיום) על המפה היומית, על קישור מסלול Google Maps, ועל תצוגת ההתחלה/סיום במסלול. חובה למלא שורה אחת לכל תאריך בטווח הטיול.'],
    ['- date (חובה): YYYY-MM-DD — חייב להיות בטווח start_date..end_date של הטיול.'],
    ['- start_point (חובה): המקום בו היום מתחיל בפועל (מלון, שדה תעופה, תחנת רכבת). כתובת מלאה קריאה ל-Google Maps / OSM.'],
    ['- end_point (חובה): המקום בו היום מסתיים בפועל (מלון, טיסה חזרה).'],
    ['- אם מתחילים ומסיימים באותו מלון — חזור על כתובת המלון בשתי העמודות.'],
    ['- בימי מעבר: start_point ו-end_point עשויים להיות מלונות / שדות תעופה / תחנות רכבת שונים.'],
    ['- התגיות "תחילת-יום" ו-"סוף-יום" בגיליון Events הן metadata מועיל, אך הן אינן מחליפות את גיליון DailyInfo.'],
    ['- אם גיליון DailyInfo חסר, המערכת תנסה להסיק נקודות מהתגיות ומהאירועים — אך זו לא תחליף לגיליון מלא ומדויק.'],
    [],
    ['📋 גיליון Trip'],
    ['- name (חובה): שם הטיול'],
    ['- destination: יעד ראשי (טקסט חופשי, למשל "רומא, איטליה")'],
    ['- start_date / end_date (חובה): פורמט YYYY-MM-DD, למשל 2026-05-10'],
    ['- base_currency (חובה): קוד מטבע ISO בן 3 אותיות (ראה רשימה למטה)'],
    ['- status: אחד מהערכים ברשימה למטה'],
    ['- budget: מספר במטבע הבסיס (אופציונלי)'],
    ['- cover_image / album_link: URL תקין כולל https:// (אופציונלי)'],
    [],
    ['📅 גיליון Events — עמודות'],
    ['- date (חובה): YYYY-MM-DD, חייב להיות בטווח start_date..end_date של הטיול'],
    ['- time (חובה): HH:MM בפורמט 24 שעות, למשל 06:00 או 14:30'],
    ['- end_time: HH:MM (אופציונלי אך מומלץ)'],
    ['- category (חובה): אחד מ: Flights ✈️ / Accommodation 🏨 / Transport 🚗 / Activity 🎭 / Food 🍽️ / Shopping 🛍️ / General 📌'],
    ['- title (חובה): כותרת קצרה וברורה (עד ~60 תווים)'],
    ['- amount (חובה): מספר בלבד, ללא סימני מטבע. אם אין עלות — 0'],
    ['- currency (חובה): קוד מטבע ISO (אם ריק — יילקח מ-base_currency של הטיול)'],
    ['- payment_method (חובה): Credit / Debit / Cash / Other'],
    ['- address (מומלץ מאוד): כתובת מלאה קריאה ל-Google Maps (ראה כללי הזהב למעלה)'],
    ['- location: תיאור אזור כללי (רובע, שכונה, נמל, קוד IATA וכו׳)'],
    ['- website: URL רשמי'],
    ['- phone: טלפון בפורמט בינלאומי'],
    ['- opening_hours: שעות פעילות'],
    ['- confirmation_num: מספר אישור / הזמנה'],
    ['- book_link: קישור להזמנה / כרטיס / צ׳ק אין'],
    ['- notes: הערות חופשיות (טיפים, אזהרות, מה להביא)'],
    ['- tags: תגיות מופרדות בפסיק. תגיות מומלצות: "תחילת-יום", "סוף-יום", "חובה", "מומלץ", "גיבוי"'],
    [],
    ['🏷️ סטטוסים אפשריים לטיול'],
    ...TRIP_STATUSES.map(s => [s]),
    [],
    ['🏷️ קטגוריות אפשריות לאירוע'],
    ...EVENT_CATEGORIES.map(c => [c]),
    [],
    ['💳 שיטות תשלום'],
    ...PAYMENT_METHODS.map(p => [p]),
    [],
    ['💱 מטבעות נתמכים'],
    [CURRENCIES.join(', ')],
  ];
  const instrSheet = XLSX.utils.aoa_to_sheet(instr);
  instrSheet['!cols'] = [{ wch: 100 }];
  XLSX.utils.book_append_sheet(wb, instrSheet, 'Instructions');

  // AI Prompt sheet — a ready-to-paste prompt for building the trip via AI
  const aiPrompt: any[][] = [
    ['🤖 Prompt מוכן ל-AI (העתק והדבק ב-ChatGPT / Claude / Gemini)'],
    ['החלף את החלקים ב-{{סוגריים}} בפרטים שלך, וצרף את הקובץ הזה או בקש מה-AI להחזיר לך שלושה CSV מוכנים להדבקה בגיליונות Trip, Events ו-DailyInfo.'],
    [],
    ['--- התחל להעתיק כאן ---'],
    ['אני בונה טיול ל-{{יעד, למשל: רומא, איטליה}} בתאריכים {{start_date}} עד {{end_date}} עבור {{מספר אנשים והרכב, למשל: זוג + 2 ילדים בני 8 ו-11}}. תקציב כולל: {{budget}} {{מטבע}}. סגנון: {{למשל: אוכל מקומי, אמנות, ללא תורים, קצב רגוע}}.'],
    [''],
    ['בנה לי לוח זמנים מפורט ומלא את שלושת הגיליונות של הקובץ המצורף (Trip, Events, DailyInfo) לפי החוקים הבאים:'],
    ['1. גיליון Trip: שורה אחת עם name, destination, start_date, end_date, base_currency, status="Planning 📝", budget.'],
    ['2. גיליון Events: לכל יום בטיול הכנס לפחות אירוע ראשון (תחילת יום, tag="תחילת-יום") ואירוע אחרון (סיום יום, tag="סוף-יום"). לרוב הימים הכנס 4-7 אירועים.'],
    ['3. עמודות חובה: date (YYYY-MM-DD), time (HH:MM 24h), end_time, category (בדיוק מאחת: Flights ✈️ / Accommodation 🏨 / Transport 🚗 / Activity 🎭 / Food 🍽️ / Shopping 🛍️ / General 📌), title, amount (מספר, 0 אם חינם), currency (ISO), payment_method (Credit/Debit/Cash/Other).'],
    ['4. שדה address חובה שיהיה כתובת מלאה שגוגל מפות פותח בלחיצה אחת: "שם המקום, רחוב+מספר, מיקוד, עיר, מדינה" — לא לכתוב רק "המלון" או "המסעדה".'],
    ['5. מלא כמה שיותר metadata לכל אירוע: website (URL מלא), phone (+פורמט בינלאומי), opening_hours, confirmation_num (השאר ריק אם לא ידוע), book_link.'],
    ['6. אירועי Accommodation — כלול address מלא של המלון + phone + opening_hours="Check-in HH:MM, Check-out HH:MM".'],
    ['7. אירועי Flights — title כולל יעד; address = שם השדה + טרמינל + מדינה; location = "IATA_מוצא → IATA_יעד"; confirmation_num = PNR/מספר טיסה.'],
    ['8. אירועי Activity — כלול website + phone + opening_hours. סמן ב-tag="מומלץ" מקומות שאסור לפספס.'],
    ['9. סדר האירועים בכל יום לפי time עולה. הימנע מחפיפות זמן.'],
    ['10. שפת title/notes: {{עברית / אנגלית}}. שמור על הכתובות באנגלית בכתיב מקומי כדי שגוגל מפות ימצא אותן.'],
    ['11. גיליון DailyInfo — חובה! צור שורה אחת לכל תאריך בטווח הטיול (כולל תאריך התחלה וסיום). עמודות: date, start_point, end_point.'],
    ['    • start_point ו-end_point חייבים להיות כתובות מלאות בשפה מקומית/אנגלית שגוגל מפות ו-OpenStreetMap Nominatim יודעים לגאוקוד.'],
    ['    • אל תניח שהתגיות "תחילת-יום" / "סוף-יום" באירועים יוצרות אוטומטית את DailyInfo — חובה למלא את הגיליון בנפרד.'],
    ['    • בימים שבהם ישנים באותו מלון — start_point = end_point = כתובת המלון המלאה.'],
    ['    • בימי מעבר — start_point עשוי להיות מלון קודם / שדה תעופה / תחנת רכבת, ו-end_point עשוי להיות מלון חדש / שדה תעופה / תחנת רכבת אחרת.'],
    [''],
    ['בסוף — החזר לי את הקובץ המצורף מעודכן, או שלושה בלוקי CSV נקיים (אחד לכל גיליון: Trip, Events, DailyInfo) שאוכל להדביק ישירות ב-Excel.'],
    ['--- סוף העתקה ---'],
  ];
  const aiSheet = XLSX.utils.aoa_to_sheet(aiPrompt);
  aiSheet['!cols'] = [{ wch: 140 }];
  XLSX.utils.book_append_sheet(wb, aiSheet, 'AI Prompt');

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
      const website = String(r.website || '').trim();
      const phone = String(r.phone || '').trim();
      const opening_hours = String(r.opening_hours || '').trim();
      const confirmation_num = String(r.confirmation_num || '').trim();
      const book_link = String(r.book_link || '').trim();
      if (website) (details as any).website = website;
      if (phone) (details as any).phone = phone;
      if (opening_hours) (details as any).opening_hours = opening_hours;
      if (confirmation_num) (details as any).confirmation_num = confirmation_num;
      if (book_link) (details as any).book_link = book_link;
      if (category === EventCategory.Accommodation && book_link) (details as any).book_link = book_link;
      // Gentle nudge: warn when address is missing for location-based categories
      if (!address && (category === EventCategory.Accommodation || category === EventCategory.Activity || category === EventCategory.Food || category === EventCategory.Shopping)) {
        warnings.push(`שורה ${rowNum}: חסרה כתובת (address) — מומלץ למלא כתובת מלאה קריאה ל-Google Maps`);
      }

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

  // ---- DailyInfo (optional) ----
  const dailyInfo: { [date: string]: DailyInfo } = {};
  const dailyInfoSheetName = wb.SheetNames.find(n => n.toLowerCase() === 'dailyinfo' || n.toLowerCase() === 'daily_info' || n.toLowerCase() === 'daily info');

  const inRange = (d: string) =>
    !start_date || !end_date || (d >= start_date && d <= end_date);

  if (dailyInfoSheetName) {
    const rows = XLSX.utils.sheet_to_json<any[]>(wb.Sheets[dailyInfoSheetName], { header: 1, raw: true, defval: '' });
    if (rows.length >= 2) {
      const headers = (rows[0] as any[]).map(h => String(h).trim().toLowerCase());
      for (let i = 1; i < rows.length; i++) {
        const raw = rows[i] as any[];
        if (!raw || raw.every(c => c === '' || c == null)) continue;
        const r = rowToObject(headers, raw);
        const rowNum = i + 1;
        const d = normalizeDate(r.date);
        if (!d || !/^\d{4}-\d{2}-\d{2}$/.test(d)) {
          warnings.push(`DailyInfo שורה ${rowNum}: תאריך לא תקין — דילוג`);
          continue;
        }
        if (!inRange(d)) {
          warnings.push(`DailyInfo שורה ${rowNum}: התאריך ${d} מחוץ לטווח הטיול`);
        }
        const sp = String(r.start_point || '').trim();
        const ep = String(r.end_point || '').trim();
        if (!sp) warnings.push(`DailyInfo ${d}: חסרה נקודת התחלה (start_point)`);
        if (!ep) warnings.push(`DailyInfo ${d}: חסרה נקודת סיום (end_point)`);
        dailyInfo[d] = {
          ...(sp ? { startPoint: sp } : {}),
          ...(ep ? { endPoint: ep } : {}),
        };
      }
    }
  }

  // ---- Inference fallback from tags / event locations ----
  if (start_date && end_date && /^\d{4}-\d{2}-\d{2}$/.test(start_date) && /^\d{4}-\d{2}-\d{2}$/.test(end_date)) {
    const eventsByDate = new Map<string, Event[]>();
    for (const ev of events) {
      const arr = eventsByDate.get(ev.date) || [];
      arr.push(ev);
      eventsByDate.set(ev.date, arr);
    }

    const hasTag = (ev: Event, tag: string) =>
      (ev.tags || []).some(t => t.replace(/[\s\u200f\u200e]/g, '') === tag.replace(/[\s\u200f\u200e]/g, ''));

    // enumerate all dates in trip range
    const s = new Date(start_date + 'T00:00:00');
    const e = new Date(end_date + 'T00:00:00');
    for (let dt = new Date(s); dt <= e; dt.setDate(dt.getDate() + 1)) {
      const key = dt.toISOString().slice(0, 10);
      const existing = dailyInfo[key] || {};
      const dayEvents = (eventsByDate.get(key) || []).slice().sort((a, b) => a.time.localeCompare(b.time));

      if (!existing.startPoint) {
        const tagged = dayEvents.find(ev => hasTag(ev, 'תחילת-יום'));
        const loc = tagged && getLocationFromEvent(tagged);
        if (loc) {
          existing.startPoint = loc;
          warnings.push(`${key}: נקודת התחלה הוסקה מתגית "תחילת-יום" (${loc})`);
        } else {
          const first = dayEvents.map(ev => getLocationFromEvent(ev)).find(Boolean);
          if (first) {
            existing.startPoint = first;
            warnings.push(`${key}: נקודת התחלה הוסקה מהאירוע הראשון של היום (${first})`);
          }
        }
      }

      if (!existing.endPoint) {
        const tagged = [...dayEvents].reverse().find(ev => hasTag(ev, 'סוף-יום'));
        const loc = tagged && getLocationFromEvent(tagged);
        if (loc) {
          existing.endPoint = loc;
          warnings.push(`${key}: נקודת סיום הוסקה מתגית "סוף-יום" (${loc})`);
        } else {
          const last = [...dayEvents].reverse().map(ev => getLocationFromEvent(ev)).find(Boolean);
          if (last) {
            existing.endPoint = last;
            warnings.push(`${key}: נקודת סיום הוסקה מהאירוע האחרון של היום (${last})`);
          }
        }
      }

      if (existing.startPoint || existing.endPoint) dailyInfo[key] = existing;
      if (!existing.startPoint) warnings.push(`${key}: חסרה נקודת התחלה יומית`);
      if (!existing.endPoint) warnings.push(`${key}: חסרה נקודת סיום יומית`);
    }
  }

  (trip as Omit<Trip, 'id' | 'events'>).dailyInfo = dailyInfo;

  return { trip, events, errors, warnings };
};



## כפתור מעבר עברית ↔ אנגלית

### גישה טכנית

ניצור מערכת תרגום (i18n) קלת משקל מבוססת React Context, בלי ספריות חיצוניות. הכפתור יופיע ליד כפתור ה-Theme Toggle.

### מבנה

**1. קובץ תרגומים `src/i18n/translations.ts`**
- אובייקט עם שני מפתחות: `he` ו-`en`
- כל מפתח מכיל את כל המחרוזות בממשק, מאורגנות לפי קטגוריות:
  - `nav`: לוח בקרה / Dashboard, הטיולים שלי / My Trips, סטטיסטיקה / Statistics...
  - `dashboard`: ברוך הבא / Welcome, טיולים / Trips, פעילויות / Activities...
  - `trip`: יום / Day, סה״כ / Total, הוסף פעילות / Add Activity, נקודת התחלה / Starting Point...
  - `actions`: חזרה / Back, עריכה / Edit, מחיקה / Delete, שיתוף / Share...
  - `auth`: התחבר / Sign In, הירשם / Sign Up, שכחתי סיסמה / Forgot Password...
  - `categories`: טיסות / Flights, לינה / Stays, הסעות / Transport...
  - `common`: חיפוש / Search, ביטול / Cancel, שמירה / Save...

**2. Context `src/contexts/LanguageContext.tsx`**
- `language`: `'he' | 'en'` (default: `'he'`)
- `setLanguage`: פונקציה להחלפה
- `t(key)`: פונקציית תרגום — מקבלת מפתח מנוקד (`'nav.dashboard'`) ומחזירה את הטקסט בשפה הנוכחית
- `dir`: `'rtl' | 'ltr'` — נגזר מהשפה
- שמירת העדפה ב-`localStorage`
- עדכון `document.documentElement.dir` ו-`document.body.style.direction` בעת החלפה

**3. כפתור `src/components/LanguageToggle.tsx`**
- כפתור פשוט עם טקסט "EN" / "עב" שמחליף שפה בלחיצה
- יושב ב-`UserProfileMenu` ליד ה-ThemeToggle

**4. עדכון קומפוננטות** — כל מקום עם טקסט hardcoded יוחלף ב-`t('key')`:
- `AppSidebar.tsx` — תפריט ניווט + כותרת
- `TopBar.tsx` — placeholder חיפוש, `dir` דינמי
- `DashboardHome.tsx` — כותרות, לייבלים, כפתורים
- `TripsGrid.tsx` — כותרת, כפתורים
- `TripCard.tsx` — תגיות סטטוס, "בעוד X ימים"
- `TripDetailView.tsx` — breadcrumbs, טאבים, סיכום הזמנה, כפתורים
- `DayItinerary.tsx` — "יום X", כפתורי פעולה, placeholders
- `EventCard.tsx` — פעולות, פרטי קטגוריה
- `Index.tsx` — כותרות דפי settings/notifications/stats, `dir` דינמי
- `Auth.tsx` — טקסטי התחברות/הרשמה
- `NotificationBell.tsx` — כותרת, כפתורים
- `UserProfileMenu.tsx` — התנתק
- `AccessibilityToggle.tsx` — תוויות
- `AddTripModal.tsx`, `EditTripModal.tsx`, `ShareModal.tsx`, `CollaboratorManager.tsx` — טקסטי טפסים
- `StatsDashboard.tsx` — כותרות גרפים
- `TripChecklist.tsx` — טקסטים

**5. RTL/LTR דינמי**
- כל `dir="rtl"` hardcoded יוחלף ב-`dir={dir}` מה-context
- ב-`AppSidebar`: `side` יהיה דינמי — `"right"` בעברית, `"left"` באנגלית
- ב-`index.css`: הסרת `direction: rtl` מ-body (יטופל דינמית ע"י ה-context)
- margins/paddings כיווניים (כמו `pr-8`, `right-3`) — נשתמש ב-Tailwind logical properties (`ps-8`, `pe-8`, `start-3`, `end-3`) כדי שהם יתהפכו אוטומטית לפי dir

### סדר ביצוע

1. יצירת קובץ תרגומים + LanguageContext + LanguageToggle
2. עטיפת App ב-LanguageProvider
3. עדכון AppSidebar, TopBar, UserProfileMenu (הנראים תמיד)
4. עדכון Dashboard + TripsGrid + TripCard
5. עדכון TripDetailView + DayItinerary + EventCard
6. עדכון מודלים (Add/Edit/Share/Collaborator)
7. עדכון Auth, Notifications, Settings, Stats, Accessibility
8. החלפת `dir="rtl"` ו-margins כיווניים ל-logical properties

~25 קבצים ישתנו. רוב השינויים הם החלפת מחרוזות ב-`t('key')` והחלפת `dir="rtl"` ב-`dir={dir}`.


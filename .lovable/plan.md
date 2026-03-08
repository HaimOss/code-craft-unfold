

## תוכנית: ייצוא וייבוא טיולים ופעילויות בין משתמשים

### גישה כפולה

**1. קישור שיתוף (Share Link)** — משתמש יוצר קישור ייחודי, המקבל לוחץ ומייבא את הטיול/פעילות לחשבון שלו.

**2. ייצוא/ייבוא קובץ JSON** — משתמש מוריד קובץ JSON ושולח אותו למישהו אחר שמעלה אותו לאפליקציה.

---

### שינויים טכניים

#### מסד נתונים
- טבלה חדשה `shared_items` עם עמודות: `id`, `user_id`, `share_token` (unique), `item_type` (trip/event), `item_data` (jsonb), `created_at`, `expires_at`
- RLS: בעלים יכול לנהל, כולם יכולים לקרוא לפי `share_token`
- פונקציית validation trigger ל-`expires_at`

#### שירות שיתוף (`src/services/shareService.ts`)
- `createShareLink(trip/event)` — שומר ב-`shared_items`, מחזיר token
- `getSharedItem(token)` — מושך את הנתונים לפי token
- `importSharedItem(token, userId)` — מייבא טיול/פעילות לחשבון המשתמש
- `exportToJSON(trip/events)` — מייצר קובץ JSON להורדה
- `importFromJSON(file, userId)` — מעלה קובץ JSON ויוצר טיול/פעילויות

#### עמוד ייבוא (`src/pages/Import.tsx`)
- נתיב `/import/:token` — עמוד ציבורי שמציג תצוגה מקדימה של הטיול/פעילות המשותפים
- כפתור "ייבא לחשבון שלי" (דורש התחברות)

#### שינויים בקומפוננטות קיימות
- **ShareModal** — יורחב עם אפשרות יצירת קישור שיתוף אמיתי (לא רק URL)
- **TripDetailView** — כפתורי "ייצוא JSON" ו-"ייבוא JSON"
- **TripDashboard** — כפתור "ייבוא טיול" (מקובץ JSON)
- **EventCard** — אפשרות שיתוף פעילות בודדת
- **App.tsx** — הוספת נתיב `/import/:token`

#### מבנה קובץ JSON
```text
{
  "version": 1,
  "type": "trip" | "event",
  "exportedAt": "...",
  "data": { ... trip/event object ... }
}
```


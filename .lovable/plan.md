

## תכנית: התאמת שדות הזנה ייחודיים לכל סוג פעילות

### קבצים לעדכון

**1. `src/types.ts`** — הרחבת/הוספת interfaces

- **FlightDetails**: הוספת `airline`, `confirmation_num`, `terminal`, `gate`, `checkin_link`
- **AccommodationDetails**: הוספת `confirmation_num`, `room_type`
- **TransportDetails**: הוספת `transport_type`, `confirmation_num`, `company`, `book_link`
- **ActivityDetails** (חדש): `location`, `phone`, `website`, `opening_hours`, `book_link`, `confirmation_num`, `address`
- **ShoppingDetails** (חדש): `address`, `opening_hours`, `website`, `customs_note`
- עדכון `EventDetails` union type לכלול את כל ה-interfaces

**2. `src/components/trip/AddEventForm.tsx`** — שדרוג `renderCategoryFields()`

- **Flights**: הוספת שדות airline (אייקון Plane), confirmation_num (FileText), terminal+gate (Building), checkin_link (Globe)
- **Accommodation**: הוספת confirmation_num (FileText), room_type (Building)
- **Transport**: הוספת select ל-transport_type (רכב שכור/רכבת/אוטובוס/מונית/מעבורת), company (Building), confirmation_num (FileText), book_link (Globe)
- **Activity** (case חדש): address, location, opening_hours, phone, website, book_link, confirmation_num
- **Shopping** (case חדש): address, opening_hours, website, customs_note
- **General**: נשאר כמו שהוא (location, phone, website)

**3. `src/components/trip/EventCard.tsx`** — עדכון `renderDetails()`

- הוספת cases ל-Activity, Food, Shopping
- הצגת שדות חדשים בכרטיסים: airline, transport_type, confirmation_num, cuisine_type, customs_note וכו'

**4. `src/components/trip/ActivityArchive.tsx`** — עדכון תצוגת פרטים מורחבים

- הצגת שדות ייחודיים לכל קטגוריה בתצוגה המורחבת

### הערות
- אין שינוי ב-DB — הכל נשמר ב-`details` JSON
- כל השדות אופציונליים
- Food הוסר מהתכנית לפי בקשת המשתמש — ישתמש ב-default/General
- תאימות לאחור מלאה — שדות חדשים פשוט לא יוצגו לאירועים ישנים


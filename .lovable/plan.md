

## תיקון RTL מושלם בכל הממשק

### בעיות שזוהו

הקוד מערבב כיוונים — חלק מהרכיבים משתמשים ב-`dir="rtl"` אבל הלייאאוט הפנימי כתוב בהנחת LTR (margins, paddings, positioning, flex directions). הנה הבעיות העיקריות:

**1. Sidebar (AppSidebar.tsx)**
- `side="right"` נכון, אבל `border-l` צריך להיות `border-r` (הגבול בצד של התוכן)
- סדר הרכיבים בכפתורי הניווט: האייקון צריך להיות מימין והטקסט משמאל (כרגע הפוך)

**2. TopBar.tsx**
- `mr-auto` על ה-SidebarTrigger צריך להיות `ml-auto` בהקשר RTL — אבל כיוון שיש `dir="rtl"`, `mr-auto` דוחף שמאלה שזה נכון. בפועל ה-SidebarTrigger צריך להיות בצד שמאל (שהוא קצה "סוף" ב-RTL) — צריך לבדוק שזה עובד.
- אייקון חיפוש: `right-3` ו-`pr-10` נכונים ב-RTL

**3. DayItinerary.tsx — הבעיה המרכזית**
- Timeline line: `left-[11px]` צריך להיות `right-[11px]` — הקו צריך להיות בצד ימין
- `pl-8` (padding-left) על האירועים צריך להיות `pr-8` — ריווח מצד ימין
- `pl-0` על נקודות התחלה/סיום צריך להיות `pr-0`
- `mr-2`, `mr-4` על תאריך היום צריכים להיות `ml-2`, `ml-4`
- `mr-1` ו-`mr-3` בתוך כפתורי Map/Export צריכים להיות `ml-1`, `ml-3`
- טקסטים באנגלית: "Day 1", "Day Total", "Add Activity", "Set Starting Point", "Set Ending Point", "Export Day", "Map" — צריכים תרגום לעברית

**4. EventCard.tsx**
- `mr-2` על drag handle צריך `ml-2`
- `mr-3` על אייקון קטגוריה צריך `ml-3`
- `ml-2` על כפתורי פעולה צריך `mr-2`
- `space-x-0.5` צריך `space-x-reverse` או gap

**5. DashboardHome.tsx**
- Badge "בעוד X ימים": `left-3` צריך `right-3` (הבאדג' צריך להיות בצד ימין של התמונה)
- כפתור FAB "תכנן טיול חדש": `left-6` צריך `right-6`

**6. TripCard.tsx**
- Badge "בעוד X ימים": `left-3` צריך `right-3`

**7. TripDetailView.tsx**
- כפתור חזרה: `right-4`/`right-8` נכון (צד ימין ב-RTL)
- Grid: `lg:grid-cols-[1fr_300px]` — ה-sidebar צריך להיות בצד שמאל, שזה נכון ב-RTL

**8. UserProfileMenu.tsx**
- `ml-2` על אייקון LogOut צריך `mr-2` (או להשתמש ב-gap)

### תוכנית ביצוע

**קובץ 1: `DayItinerary.tsx`** — התיקון הגדול
- היפוך כל ה-margins/paddings מ-left ל-right
- Timeline line: `left-[11px]` → `right-[11px]`
- `pl-8` → `pr-8`
- תרגום כל הטקסטים לעברית: "Day X" → "יום X", "Day Total" → "סה״כ יומי", "Add Activity" → "הוסף פעילות +", "Set Starting Point" → "הגדר נקודת התחלה", "Set Ending Point" → "הגדר נקודת סיום", "Export Day" → "ייצוא יום", "Enter starting point..." → "נקודת התחלה..."

**קובץ 2: `EventCard.tsx`**
- היפוך margins: `mr-2` → `ml-2`, `mr-3` → `ml-3`, `ml-2` → `mr-2`
- `space-x-0.5` → `gap-0.5` (neutral direction)

**קובץ 3: `DashboardHome.tsx`**
- Badge positioning: `left-3` → `right-3`
- FAB: `left-6` → `right-6`

**קובץ 4: `TripCard.tsx`**
- Badge: `left-3` → `right-3`

**קובץ 5: `AppSidebar.tsx`**
- `border-l` → `border-r` (או להסיר — ה-sidebar כבר מופרד)
- וידוא סדר אייקון-טקסט תואם RTL

**קובץ 6: `TopBar.tsx`**
- `mr-auto` → `ml-auto` (ב-RTL context עם dir="rtl", ml-auto דוחף לצד שמאל שהוא "סוף")

**קובץ 7: `UserProfileMenu.tsx`**
- `ml-2` → `mr-2` על אייקון

**קובץ 8: `index.css`**
- הוספת `direction: rtl` גלובלי ל-body כדי שכל הרכיבים ירשו RTL

סה"כ ~8 קבצים עם שינויים מדויקים, בעיקר היפוך margins/paddings ותרגום טקסטים שנשארו באנגלית.


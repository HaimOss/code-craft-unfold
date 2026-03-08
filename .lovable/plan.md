

## תוכנית: בנק פעילויות (Activity Bank)

### סקירה
מערכת לשמירת פעילויות מעניינות שניתן לשבץ לטיולים בעתיד, עם יכולת שיתוף בין משתמשים.

### שינויי Database

**טבלה חדשה: `saved_activities`**
```sql
CREATE TABLE saved_activities (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL,
  title text NOT NULL,
  category text NOT NULL,
  location text,
  details jsonb DEFAULT '{}',
  notes text,
  tags text[] DEFAULT '{}',
  estimated_cost numeric,
  currency text DEFAULT 'ILS',
  source_url text,  -- קישור למקור (אתר, המלצה)
  is_public boolean DEFAULT false,  -- האם לשתף עם כולם
  created_at timestamptz DEFAULT now()
);
```

**טבלה חדשה: `activity_shares`** (שיתוף עם משתמשים ספציפיים)
```sql
CREATE TABLE activity_shares (
  id uuid PRIMARY KEY,
  activity_id uuid REFERENCES saved_activities(id) ON DELETE CASCADE,
  shared_by uuid NOT NULL,
  shared_with_email text NOT NULL,
  share_token text UNIQUE,
  status text DEFAULT 'pending',
  created_at timestamptz DEFAULT now()
);
```

### קומפוננטות חדשות

1. **ActivityBank.tsx** - תצוגה ראשית של הבנק:
   - רשימת פעילויות שמורות עם חיפוש וסינון
   - אפשרות להוסיף פעילות חדשה
   - אפשרות לשבץ פעילות לטיול קיים
   - אפשרות לשתף או לקבל שיתופים

2. **SaveActivityModal.tsx** - הוספת/עריכת פעילות לבנק

3. **AssignToTripModal.tsx** - בחירת טיול לשיבוץ הפעילות

### שינויים בקוד קיים

- **AppSidebar.tsx**: הוספת לשונית "בנק פעילויות" (אייקון Bookmark)
- **Index.tsx**: הוספת view חדש `'activityBank'`
- **translations.ts**: תרגומים לעברית ואנגלית

### זרימת משתמש

```text
┌─────────────────────────────────────────────────┐
│  בנק פעילויות                                   │
├─────────────────────────────────────────────────┤
│  [+ הוסף פעילות]  [קיבלתי שיתוף (2)]            │
│  ─────────────────────────────────────────────  │
│  🎭 סיור גרפיטי בתל אביב                        │
│     📍 פלורנטין │ ⏱️ 3 שעות │ ₪120             │
│     [שבץ לטיול] [שתף] [מחק]                     │
│  ─────────────────────────────────────────────  │
│  🍽️ מסעדת דיינינג במילאנו                       │
│     📍 מילאנו │ €80                             │
│     [שבץ לטיול] [שתף] [מחק]                     │
└─────────────────────────────────────────────────┘
```

### סיכום שלבים

| שלב | תיאור |
|-----|-------|
| 1 | יצירת טבלאות DB עם RLS policies |
| 2 | ActivityBank + SaveActivityModal |
| 3 | AssignToTripModal לשיבוץ בטיול |
| 4 | מנגנון שיתוף (קישור/אימייל) |
| 5 | אינטגרציה בסיידבר + תרגומים |


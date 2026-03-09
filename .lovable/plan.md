

## הבעיה

בקטגוריית Activity יש שני שדות כתובת נפרדים:
1. **Address** (`details.address`) - כתובת מדויקת
2. **Location / Area** (`details.location`) - אזור/מיקום כללי

שניהם משרתים תפקיד דומה מאוד ומבלבלים את המשתמש.

## הפתרון

לאחד את שני השדות לשדה אחד בשם **"כתובת / מיקום"** (Address / Location) שישמור ל-`details.address` בלבד. השדה `location` יוסר מטופס ה-Activity.

### שינויים נדרשים

1. **`AddEventForm.tsx`** — בקטגוריית `Activity`, להסיר את שדה `location` ולהשאיר רק את שדה `address` עם placeholder משולב "Address / Location" (או "כתובת / מיקום").

2. **`handleImportFromBank`** — לוודא שה-`location` מהבנק ממופה ל-`address` בלבד (כבר קיים).

3. **`EventCard.tsx`** — לוודא שהתצוגה משתמשת ב-`address` כשדה העיקרי (לבדוק שאין הצגה כפולה).


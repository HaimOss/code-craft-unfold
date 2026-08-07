export type ExpenseScope = 'general' | 'daily';

export interface ExpenseCategoryDef {
  key: string;
  label: string;
  icon: string;
  subcategories: string[];
}

export const GENERAL_EXPENSE_CATEGORIES: ExpenseCategoryDef[] = [
  {
    key: 'vehicle',
    label: 'רכב והשכרה',
    icon: '🚙',
    subcategories: ['השכרת רכב', 'ביטוח רכב ותוספות', 'וינייטה', 'מדבקה סביבתית'],
  },
  {
    key: 'insurance',
    label: 'ביטוחים',
    icon: '🛡️',
    subcategories: ['ביטוח נסיעות', 'ביטוח מטען', 'ביטוח ביטול'],
  },
  {
    key: 'passes',
    label: 'כרטיסי Pass',
    icon: '🎟️',
    subcategories: ['Pass רב יומי', 'כרטיס עירוני', 'כרטיס תחבורה שבועי'],
  },
  {
    key: 'fees',
    label: 'אגרות כלליות',
    icon: '🧾',
    subcategories: ['אגרת כניסה לאזור', 'אגרת ויזה', 'אגרות שונות'],
  },
  {
    key: 'connectivity',
    label: 'תקשורת',
    icon: '📱',
    subcategories: ['eSIM', 'SIM מקומי', 'חבילת גלישה', 'אינטרנט נייד'],
  },
  {
    key: 'gear',
    label: 'ציוד לטיול',
    icon: '🎒',
    subcategories: ['ציוד קמפינג', 'ביגוד טכני', 'מזוודות ואביזרים', 'אלקטרוניקה לטיול'],
  },
  {
    key: 'other_general',
    label: 'אחר',
    icon: '📌',
    subcategories: ['אחר'],
  },
];

export const DAILY_EXPENSE_CATEGORIES: ExpenseCategoryDef[] = [
  {
    key: 'food',
    label: 'אוכל',
    icon: '🍽️',
    subcategories: ['סופרמרקט', 'מסעדה', 'בית קפה', 'מאפייה', 'מזון מהיר', 'גלידה / קינוחים', 'חטיפים ושתייה'],
  },
  {
    key: 'transport',
    label: 'רכב ותחבורה',
    icon: '⛽',
    subcategories: ['דלק', 'טעינת רכב חשמלי', 'חניה', 'כבישי אגרה נקודתיים', 'מנהרות ומעברים בתשלום', 'תחבורה ציבורית', 'מונית / Uber / Bolt', 'מעבורת'],
  },
  {
    key: 'shopping',
    label: 'קניות',
    icon: '🛍️',
    subcategories: ['מזכרות', 'בגדים', 'נעליים', 'מתנות', 'צעצועים', 'אלקטרוניקה', 'קניות אישיות', 'קניות כלליות'],
  },
  {
    key: 'lodging_extras',
    label: 'הוצאות לינה שוטפות',
    icon: '🏨',
    subcategories: ['דמי ניקיון נוספים', 'כביסה בלינה', 'מס עירוני', 'חניה במקום הלינה', 'ארוחת בוקר בתשלום', 'שירותים נוספים בלינה'],
  },
  {
    key: 'health',
    label: 'בריאות',
    icon: '💊',
    subcategories: ['בית מרקחת', 'תרופות', 'טיפול רפואי'],
  },
  {
    key: 'services',
    label: 'שירותים שונים',
    icon: '🧰',
    subcategories: ['שירותים ציבוריים', 'לוקרים', 'שמירת חפצים', 'כביסה חיצונית', 'טיפים', 'אחר'],
  },
];

export const ALL_EXPENSE_CATEGORIES = [...GENERAL_EXPENSE_CATEGORIES, ...DAILY_EXPENSE_CATEGORIES];

export const getExpenseCategory = (key: string) =>
  ALL_EXPENSE_CATEGORIES.find(c => c.key === key);

export const getExpenseCategoryLabel = (key: string) =>
  getExpenseCategory(key)?.label || key;

export const getExpenseCategoryIcon = (key: string) =>
  getExpenseCategory(key)?.icon || '💸';
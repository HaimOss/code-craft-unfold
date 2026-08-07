import React, { useEffect, useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { CURRENCIES, PAYMENT_METHODS } from '@/constants';
import { GENERAL_EXPENSE_CATEGORIES, DAILY_EXPENSE_CATEGORIES, ExpenseScope } from '@/constants/expenses';
import type { ExpenseInput, TripExpense } from '@/services/expenseService';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (input: ExpenseInput, id?: string) => Promise<void> | void;
  baseCurrency: string;
  tripStart: string;
  tripEnd: string;
  defaultScope?: ExpenseScope;
  defaultDate?: string;
  editing?: TripExpense | null;
}

const ExpenseFormModal: React.FC<Props> = ({
  isOpen, onClose, onSave, baseCurrency, tripStart, tripEnd, defaultScope = 'daily', defaultDate, editing,
}) => {
  const [scope, setScope] = useState<ExpenseScope>(defaultScope);
  const [category, setCategory] = useState('');
  const [subcategory, setSubcategory] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState(baseCurrency);
  const [paymentMethod, setPaymentMethod] = useState<string>(PAYMENT_METHODS[0]);
  const [expenseDate, setExpenseDate] = useState(defaultDate || tripStart);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const categories = scope === 'general' ? GENERAL_EXPENSE_CATEGORIES : DAILY_EXPENSE_CATEGORIES;

  useEffect(() => {
    if (!isOpen) return;
    if (editing) {
      setScope(editing.scope);
      setCategory(editing.category);
      setSubcategory(editing.subcategory || '');
      setDescription(editing.description || '');
      setAmount(String(editing.amount));
      setCurrency(editing.currency);
      setPaymentMethod(editing.payment_method);
      setExpenseDate(editing.expense_date || defaultDate || tripStart);
      setNotes(editing.notes || '');
    } else {
      setScope(defaultScope);
      setCategory((defaultScope === 'general' ? GENERAL_EXPENSE_CATEGORIES : DAILY_EXPENSE_CATEGORIES)[0].key);
      setSubcategory('');
      setDescription('');
      setAmount('');
      setCurrency(baseCurrency);
      setPaymentMethod(PAYMENT_METHODS[0]);
      setExpenseDate(defaultDate || tripStart);
      setNotes('');
    }
  }, [isOpen, editing, defaultScope, defaultDate, tripStart, baseCurrency]);

  const subOptions = useMemo(
    () => categories.find(c => c.key === category)?.subcategories || [],
    [categories, category]
  );

  if (!isOpen) return null;

  const handleScopeChange = (s: ExpenseScope) => {
    setScope(s);
    const list = s === 'general' ? GENERAL_EXPENSE_CATEGORIES : DAILY_EXPENSE_CATEGORIES;
    setCategory(list[0].key);
    setSubcategory('');
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!category || !amount) return;
    setSaving(true);
    try {
      await onSave({
        scope,
        category,
        subcategory: subcategory || null,
        description: description.trim(),
        amount: Number(amount) || 0,
        currency,
        payment_method: paymentMethod,
        expense_date: scope === 'daily' ? expenseDate : null,
        notes: notes.trim() || null,
      }, editing?.id);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-foreground/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-card w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl max-h-[92vh] overflow-y-auto border border-border shadow-xl">
        <div className="sticky top-0 bg-card border-b border-border px-5 py-4 flex items-center justify-between">
          <h3 className="font-bold font-display">{editing ? 'עריכת הוצאה' : 'הוצאה חדשה'}</h3>
          <button onClick={onClose} className="btn-ghost p-2 rounded-lg"><X className="h-4 w-4" /></button>
        </div>

        <form onSubmit={submit} className="p-5 space-y-4">
          <div className="flex bg-secondary rounded-lg p-1 gap-1">
            {(['daily', 'general'] as ExpenseScope[]).map(s => (
              <button
                key={s}
                type="button"
                onClick={() => handleScopeChange(s)}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${scope === s ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground'}`}
              >
                {s === 'daily' ? 'הוצאה יומית' : 'הוצאה כללית'}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground">קטגוריה *</label>
              <select value={category} onChange={e => { setCategory(e.target.value); setSubcategory(''); }} className="w-full mt-1 bg-background border border-border rounded-lg px-3 py-2 text-sm">
                {categories.map(c => <option key={c.key} value={c.key}>{c.icon} {c.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">תת קטגוריה</label>
              <input
                list="expense-subcats"
                value={subcategory}
                onChange={e => setSubcategory(e.target.value)}
                className="w-full mt-1 bg-background border border-border rounded-lg px-3 py-2 text-sm"
                placeholder="בחר או הקלד"
              />
              <datalist id="expense-subcats">
                {subOptions.map(s => <option key={s} value={s} />)}
              </datalist>
            </div>
          </div>

          <div>
            <label className="text-xs text-muted-foreground">תיאור</label>
            <input value={description} onChange={e => setDescription(e.target.value)} className="w-full mt-1 bg-background border border-border rounded-lg px-3 py-2 text-sm" placeholder="לדוגמה: תדלוק בתחנה ליד זלצבורג" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground">סכום *</label>
              <input type="number" step="0.01" min="0" required value={amount} onChange={e => setAmount(e.target.value)} className="w-full mt-1 bg-background border border-border rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">מטבע</label>
              <select value={currency} onChange={e => setCurrency(e.target.value)} className="w-full mt-1 bg-background border border-border rounded-lg px-3 py-2 text-sm">
                {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground">אמצעי תשלום</label>
              <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)} className="w-full mt-1 bg-background border border-border rounded-lg px-3 py-2 text-sm">
                {PAYMENT_METHODS.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            {scope === 'daily' && (
              <div>
                <label className="text-xs text-muted-foreground">תאריך *</label>
                <input type="date" required min={tripStart} max={tripEnd} value={expenseDate} onChange={e => setExpenseDate(e.target.value)} className="w-full mt-1 bg-background border border-border rounded-lg px-3 py-2 text-sm" />
              </div>
            )}
          </div>

          <div>
            <label className="text-xs text-muted-foreground">הערה</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} className="w-full mt-1 bg-background border border-border rounded-lg px-3 py-2 text-sm" />
          </div>

          <p className="text-xs text-muted-foreground bg-secondary/60 rounded-lg p-3">
            💡 אין להזין כאן עלויות שכבר קיימות כפעילות בטיול (טיסות, לינה, אטרקציות) — הן נספרות אוטומטית בסיכום.
          </p>

          <div className="flex gap-2 pt-1">
            <button type="submit" disabled={saving} className="flex-1 btn-primary text-sm py-2.5 rounded-lg disabled:opacity-60">
              {saving ? 'שומר...' : editing ? 'עדכן הוצאה' : 'הוסף הוצאה'}
            </button>
            <button type="button" onClick={onClose} className="btn-ghost border border-border text-sm px-4 rounded-lg">ביטול</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ExpenseFormModal;
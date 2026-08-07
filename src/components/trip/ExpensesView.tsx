import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Trip } from '@/types';
import { CURRENCY_SYMBOLS } from '@/constants';
import {
  ALL_EXPENSE_CATEGORIES, ExpenseScope,
  getExpenseCategoryIcon, getExpenseCategoryLabel,
} from '@/constants/expenses';
import { fetchExpenses, createExpense, updateExpense, deleteExpense, TripExpense, ExpenseInput } from '@/services/expenseService';
import { normalizeCost } from '@/services/currencyService';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import ExpenseFormModal from './ExpenseFormModal';
import { Plus, Pencil, Trash2, ArrowUpDown, Wallet, TrendingUp, Users, PieChart } from 'lucide-react';

interface Props {
  trip: Trip;
}

type SortKey = 'date' | 'amount' | 'category';

const ExpensesView: React.FC<Props> = ({ trip }) => {
  const { user } = useAuth();
  const [expenses, setExpenses] = useState<TripExpense[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<TripExpense | null>(null);
  const [defaultScope, setDefaultScope] = useState<ExpenseScope>('daily');

  // filters
  const [scopeFilter, setScopeFilter] = useState<'all' | ExpenseScope>('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  // normalized amounts (base currency)
  const [normalized, setNormalized] = useState<Record<string, number>>({});
  const [activitiesTotal, setActivitiesTotal] = useState(0);

  const symbol = CURRENCY_SYMBOLS[trip.base_currency] || trip.base_currency;
  const travelers = Math.max(1, Number((trip as any).travelers_count) || 1);

  const tripDates = useMemo(() => {
    const out: string[] = [];
    const d = new Date(trip.start_date + 'T00:00:00');
    const end = new Date(trip.end_date + 'T00:00:00');
    while (d <= end) {
      out.push(d.toISOString().split('T')[0]);
      d.setDate(d.getDate() + 1);
    }
    return out;
  }, [trip.start_date, trip.end_date]);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setExpenses(await fetchExpenses(trip.id));
    } catch (e: any) {
      toast({ title: 'שגיאה בטעינת הוצאות', description: e.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [trip.id]);

  useEffect(() => { load(); }, [load]);

  // convert everything to base currency
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const entries = await Promise.all(expenses.map(async ex => [
        ex.id,
        await normalizeCost(ex.amount, ex.currency, trip.base_currency, ex.expense_date || trip.start_date),
      ] as const));
      if (!cancelled) setNormalized(Object.fromEntries(entries));
    })();
    return () => { cancelled = true; };
  }, [expenses, trip.base_currency, trip.start_date]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const costs = await Promise.all(trip.events.map(e => normalizeCost(e.amount, e.currency, trip.base_currency, e.date)));
      if (!cancelled) setActivitiesTotal(costs.reduce((s, c) => s + c, 0));
    })();
    return () => { cancelled = true; };
  }, [trip.events, trip.base_currency]);

  const conv = (ex: TripExpense) => normalized[ex.id] ?? ex.amount;

  const generalTotal = useMemo(
    () => expenses.filter(e => e.scope === 'general').reduce((s, e) => s + conv(e), 0),
    [expenses, normalized]
  );
  const dailyTotal = useMemo(
    () => expenses.filter(e => e.scope === 'daily').reduce((s, e) => s + conv(e), 0),
    [expenses, normalized]
  );
  const grandTotal = activitiesTotal + generalTotal + dailyTotal;

  const byCategory = useMemo(() => {
    const map: Record<string, number> = {};
    // activities count as their own event categories (already-entered costs)
    trip.events.forEach(e => {
      map[`event:${e.category}`] = (map[`event:${e.category}`] || 0) + e.amount;
    });
    expenses.forEach(e => {
      map[e.category] = (map[e.category] || 0) + conv(e);
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [expenses, normalized, trip.events]);

  const byDay = useMemo(() => {
    const map: Record<string, number> = {};
    tripDates.forEach(d => { map[d] = 0; });
    trip.events.forEach(e => { map[e.date] = (map[e.date] || 0) + e.amount; });
    expenses.filter(e => e.scope === 'daily' && e.expense_date).forEach(e => {
      map[e.expense_date!] = (map[e.expense_date!] || 0) + conv(e);
    });
    return Object.entries(map).sort((a, b) => a[0].localeCompare(b[0]));
  }, [expenses, normalized, trip.events, tripDates]);

  const avgPerDay = tripDates.length ? grandTotal / tripDates.length : 0;
  const perPerson = grandTotal / travelers;
  const topCategory = byCategory[0];

  const filtered = useMemo(() => {
    let list = [...expenses];
    if (scopeFilter !== 'all') list = list.filter(e => e.scope === scopeFilter);
    if (categoryFilter !== 'all') list = list.filter(e => e.category === categoryFilter);
    if (dateFilter !== 'all') list = list.filter(e => e.expense_date === dateFilter);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(e =>
        e.description?.toLowerCase().includes(q) ||
        e.subcategory?.toLowerCase().includes(q) ||
        e.notes?.toLowerCase().includes(q) ||
        getExpenseCategoryLabel(e.category).toLowerCase().includes(q)
      );
    }
    list.sort((a, b) => {
      let r = 0;
      if (sortKey === 'amount') r = conv(a) - conv(b);
      else if (sortKey === 'category') r = getExpenseCategoryLabel(a.category).localeCompare(getExpenseCategoryLabel(b.category));
      else r = (a.expense_date || a.created_at).localeCompare(b.expense_date || b.created_at);
      return sortDir === 'asc' ? r : -r;
    });
    return list;
  }, [expenses, normalized, scopeFilter, categoryFilter, dateFilter, search, sortKey, sortDir]);

  const filteredTotal = filtered.reduce((s, e) => s + conv(e), 0);

  const handleSave = async (input: ExpenseInput, id?: string) => {
    if (!user) return;
    try {
      if (id) {
        const updated = await updateExpense(id, input);
        setExpenses(prev => prev.map(e => e.id === id ? updated : e));
        toast({ title: 'ההוצאה עודכנה' });
      } else {
        const created = await createExpense(user.id, trip.id, input);
        setExpenses(prev => [created, ...prev]);
        toast({ title: 'ההוצאה נוספה' });
      }
    } catch (e: any) {
      toast({ title: 'שגיאה בשמירת ההוצאה', description: e.message, variant: 'destructive' });
    }
  };

  const handleDelete = async (ex: TripExpense) => {
    if (!window.confirm('למחוק את ההוצאה?')) return;
    try {
      await deleteExpense(ex.id);
      setExpenses(prev => prev.filter(e => e.id !== ex.id));
    } catch (e: any) {
      toast({ title: 'שגיאה במחיקה', description: e.message, variant: 'destructive' });
    }
  };

  const money = (n: number) => `${symbol}${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

  const openNew = (scope: ExpenseScope) => {
    setEditing(null);
    setDefaultScope(scope);
    setModalOpen(true);
  };

  const catLabel = (key: string) =>
    key.startsWith('event:') ? key.replace('event:', '') : `${getExpenseCategoryIcon(key)} ${getExpenseCategoryLabel(key)}`;

  return (
    <div className="space-y-5">
      {/* Summary */}
      <div className="bg-card border border-border rounded-2xl p-5">
        <h3 className="font-bold font-display mb-4 flex items-center gap-2"><Wallet className="h-4 w-4 text-accent" /> סיכום עלות אמיתית</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
          <div className="bg-secondary/50 rounded-xl p-3">
            <p className="text-xs text-muted-foreground">עלויות מהפעילויות</p>
            <p className="text-xl font-bold">{money(activitiesTotal)}</p>
          </div>
          <div className="bg-secondary/50 rounded-xl p-3">
            <p className="text-xs text-muted-foreground">הוצאות כלליות</p>
            <p className="text-xl font-bold">{money(generalTotal)}</p>
          </div>
          <div className="bg-secondary/50 rounded-xl p-3">
            <p className="text-xs text-muted-foreground">הוצאות יומיות</p>
            <p className="text-xl font-bold">{money(dailyTotal)}</p>
          </div>
        </div>
        <div className="border-t border-border pt-3 flex items-center justify-between">
          <span className="font-bold">סה"כ עלות הטיול</span>
          <span className="text-2xl font-bold text-accent">{money(grandTotal)}</span>
        </div>
        <div className="grid grid-cols-3 gap-3 mt-4 text-center">
          <div>
            <p className="text-xs text-muted-foreground flex items-center justify-center gap-1"><TrendingUp className="h-3 w-3" /> ממוצע ליום</p>
            <p className="font-bold mt-0.5">{money(avgPerDay)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground flex items-center justify-center gap-1"><Users className="h-3 w-3" /> עלות לאדם ({travelers})</p>
            <p className="font-bold mt-0.5">{money(perPerson)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground flex items-center justify-center gap-1"><PieChart className="h-3 w-3" /> הקטגוריה היקרה</p>
            <p className="font-bold mt-0.5 text-sm truncate">{topCategory ? catLabel(topCategory[0]) : '—'}</p>
          </div>
        </div>
        <p className="text-[11px] text-muted-foreground mt-4">
          * עלויות שכבר הוזנו כפעילות (טיסות, לינה, אטרקציות) נספרות פעם אחת בלבד ואין להזין אותן שוב כאן.
        </p>
      </div>

      {/* Breakdown */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div className="bg-card border border-border rounded-2xl p-5">
          <h4 className="font-bold text-sm mb-3">הוצאות לפי קטגוריה</h4>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {byCategory.map(([key, val]) => (
              <div key={key}>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground truncate">{catLabel(key)}</span>
                  <span className="font-medium">{money(val)}</span>
                </div>
                <div className="h-1.5 bg-secondary rounded-full mt-1 overflow-hidden">
                  <div className="h-full bg-accent rounded-full" style={{ width: `${grandTotal ? (val / grandTotal) * 100 : 0}%` }} />
                </div>
              </div>
            ))}
            {byCategory.length === 0 && <p className="text-sm text-muted-foreground">אין נתונים</p>}
          </div>
        </div>

        <div className="bg-card border border-border rounded-2xl p-5">
          <h4 className="font-bold text-sm mb-3">הוצאות לפי יום</h4>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {byDay.map(([date, val], i) => (
              <div key={date} className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">יום {i + 1} · {date}</span>
                <span className="font-medium">{money(val)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Actions + filters */}
      <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
        <div className="flex flex-wrap gap-2">
          <button onClick={() => openNew('daily')} className="btn-primary text-sm px-4 py-2 rounded-lg flex items-center gap-1.5">
            <Plus className="h-4 w-4" /> הוצאה יומית
          </button>
          <button onClick={() => openNew('general')} className="btn-secondary text-sm px-4 py-2 rounded-lg flex items-center gap-1.5">
            <Plus className="h-4 w-4" /> הוצאה כללית
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          <select value={scopeFilter} onChange={e => setScopeFilter(e.target.value as any)} className="bg-background border border-border rounded-lg px-2 py-2 text-xs">
            <option value="all">כל הסוגים</option>
            <option value="general">כלליות</option>
            <option value="daily">יומיות</option>
          </select>
          <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} className="bg-background border border-border rounded-lg px-2 py-2 text-xs">
            <option value="all">כל הקטגוריות</option>
            {ALL_EXPENSE_CATEGORIES.map(c => <option key={c.key} value={c.key}>{c.icon} {c.label}</option>)}
          </select>
          <select value={dateFilter} onChange={e => setDateFilter(e.target.value)} className="bg-background border border-border rounded-lg px-2 py-2 text-xs">
            <option value="all">כל התאריכים</option>
            {tripDates.map((d, i) => <option key={d} value={d}>יום {i + 1} · {d}</option>)}
          </select>
          <select
            value={`${sortKey}:${sortDir}`}
            onChange={e => { const [k, d] = e.target.value.split(':'); setSortKey(k as SortKey); setSortDir(d as 'asc' | 'desc'); }}
            className="bg-background border border-border rounded-lg px-2 py-2 text-xs"
          >
            <option value="date:desc">תאריך ↓</option>
            <option value="date:asc">תאריך ↑</option>
            <option value="amount:desc">סכום ↓</option>
            <option value="amount:asc">סכום ↑</option>
            <option value="category:asc">קטגוריה א-ת</option>
          </select>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="חיפוש..." className="bg-background border border-border rounded-lg px-2 py-2 text-xs col-span-2 sm:col-span-1" />
        </div>

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span className="flex items-center gap-1"><ArrowUpDown className="h-3 w-3" /> {filtered.length} הוצאות</span>
          <span className="font-bold text-foreground">{money(filteredTotal)}</span>
        </div>
      </div>

      {/* List */}
      <div className="space-y-2">
        {loading ? (
          <div className="card-surface p-12 flex items-center justify-center">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-card border border-border rounded-2xl p-10 text-center text-muted-foreground text-sm">
            עדיין לא נוספו הוצאות. התחל בהוספת הוצאה יומית או כללית.
          </div>
        ) : filtered.map(ex => (
          <div key={ex.id} className="bg-card border border-border rounded-xl p-3 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center text-lg shrink-0">
              {getExpenseCategoryIcon(ex.category)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium truncate">
                {ex.description || ex.subcategory || getExpenseCategoryLabel(ex.category)}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {getExpenseCategoryLabel(ex.category)}
                {ex.subcategory ? ` · ${ex.subcategory}` : ''}
                {ex.expense_date ? ` · ${ex.expense_date}` : ' · כללי'}
                {` · ${ex.payment_method}`}
              </p>
              {ex.notes && <p className="text-[11px] text-muted-foreground truncate mt-0.5">📝 {ex.notes}</p>}
            </div>
            <div className="text-end shrink-0">
              <p className="font-bold text-sm text-accent">
                {CURRENCY_SYMBOLS[ex.currency] || ex.currency}{ex.amount.toLocaleString()}
              </p>
              {ex.currency !== trip.base_currency && (
                <p className="text-[11px] text-muted-foreground">≈ {money(conv(ex))}</p>
              )}
            </div>
            <div className="flex flex-col gap-1 shrink-0">
              <button onClick={() => { setEditing(ex); setModalOpen(true); }} className="btn-ghost p-2 rounded-lg"><Pencil className="h-3.5 w-3.5" /></button>
              <button onClick={() => handleDelete(ex)} className="btn-ghost p-2 rounded-lg text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
            </div>
          </div>
        ))}
      </div>

      <ExpenseFormModal
        isOpen={modalOpen}
        onClose={() => { setModalOpen(false); setEditing(null); }}
        onSave={handleSave}
        baseCurrency={trip.base_currency}
        tripStart={trip.start_date}
        tripEnd={trip.end_date}
        defaultScope={defaultScope}
        editing={editing}
      />
    </div>
  );
};

export default ExpensesView;
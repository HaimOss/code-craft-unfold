import { supabase } from '@/integrations/supabase/client';
import type { ExpenseScope } from '@/constants/expenses';

export interface TripExpense {
  id: string;
  trip_id: string;
  user_id: string;
  scope: ExpenseScope;
  category: string;
  subcategory?: string | null;
  description: string;
  amount: number;
  currency: string;
  payment_method: string;
  expense_date?: string | null;
  notes?: string | null;
  created_at: string;
}

const toExpense = (row: any): TripExpense => ({
  ...row,
  amount: Number(row.amount),
  scope: row.scope as ExpenseScope,
});

export const fetchExpenses = async (tripId: string): Promise<TripExpense[]> => {
  const { data, error } = await supabase
    .from('trip_expenses')
    .select('*')
    .eq('trip_id', tripId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []).map(toExpense);
};

export type ExpenseInput = Omit<TripExpense, 'id' | 'user_id' | 'created_at' | 'trip_id'>;

export const createExpense = async (userId: string, tripId: string, input: ExpenseInput): Promise<TripExpense> => {
  const { data, error } = await supabase
    .from('trip_expenses')
    .insert([{ ...input, user_id: userId, trip_id: tripId }])
    .select('*')
    .single();
  if (error) throw error;
  return toExpense(data);
};

export const updateExpense = async (id: string, input: ExpenseInput): Promise<TripExpense> => {
  const { data, error } = await supabase
    .from('trip_expenses')
    .update({ ...input })
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw error;
  return toExpense(data);
};

export const deleteExpense = async (id: string) => {
  const { error } = await supabase.from('trip_expenses').delete().eq('id', id);
  if (error) throw error;
};
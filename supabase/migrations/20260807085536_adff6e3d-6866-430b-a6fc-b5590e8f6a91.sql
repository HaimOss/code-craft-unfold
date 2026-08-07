ALTER TABLE public.trips ADD COLUMN IF NOT EXISTS travelers_count integer NOT NULL DEFAULT 1;

CREATE TABLE public.trip_expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  scope text NOT NULL DEFAULT 'daily',
  category text NOT NULL,
  subcategory text,
  description text NOT NULL DEFAULT '',
  amount numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'ILS',
  payment_method text NOT NULL DEFAULT 'Credit',
  expense_date date,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.trip_expenses TO authenticated;
GRANT ALL ON public.trip_expenses TO service_role;

ALTER TABLE public.trip_expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own trip expenses" ON public.trip_expenses
  FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.is_trip_owner(auth.uid(), trip_id) OR public.is_trip_collaborator(auth.uid(), trip_id));
CREATE POLICY "Users can insert trip expenses" ON public.trip_expenses
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id AND (public.is_trip_owner(auth.uid(), trip_id) OR public.is_trip_collaborator(auth.uid(), trip_id)));
CREATE POLICY "Users can update trip expenses" ON public.trip_expenses
  FOR UPDATE TO authenticated USING (auth.uid() = user_id OR public.is_trip_owner(auth.uid(), trip_id) OR public.is_trip_collaborator(auth.uid(), trip_id));
CREATE POLICY "Users can delete trip expenses" ON public.trip_expenses
  FOR DELETE TO authenticated USING (auth.uid() = user_id OR public.is_trip_owner(auth.uid(), trip_id) OR public.is_trip_collaborator(auth.uid(), trip_id));

CREATE INDEX idx_trip_expenses_trip ON public.trip_expenses(trip_id);

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_trip_expenses_updated_at
  BEFORE UPDATE ON public.trip_expenses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
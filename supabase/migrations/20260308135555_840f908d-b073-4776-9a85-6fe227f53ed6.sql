
-- Create checklist items table
CREATE TABLE public.checklist_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  text text NOT NULL,
  is_completed boolean NOT NULL DEFAULT false,
  category text NOT NULL DEFAULT 'task',
  priority text NOT NULL DEFAULT 'normal',
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.checklist_items ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view own checklist items"
  ON public.checklist_items FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own checklist items"
  ON public.checklist_items FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own checklist items"
  ON public.checklist_items FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own checklist items"
  ON public.checklist_items FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Collaborators policies
CREATE POLICY "Collaborators can view shared checklist items"
  ON public.checklist_items FOR SELECT
  TO authenticated
  USING (is_trip_collaborator(auth.uid(), trip_id));

CREATE POLICY "Collaborators can insert shared checklist items"
  ON public.checklist_items FOR INSERT
  TO authenticated
  WITH CHECK (is_trip_collaborator(auth.uid(), trip_id));

CREATE POLICY "Collaborators can update shared checklist items"
  ON public.checklist_items FOR UPDATE
  TO authenticated
  USING (is_trip_collaborator(auth.uid(), trip_id));

CREATE POLICY "Collaborators can delete shared checklist items"
  ON public.checklist_items FOR DELETE
  TO authenticated
  USING (is_trip_collaborator(auth.uid(), trip_id));

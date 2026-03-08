
-- Family members table
CREATE TABLE public.family_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  avatar_emoji text DEFAULT '👤',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.family_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own family members" ON public.family_members FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own family members" ON public.family_members FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own family members" ON public.family_members FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own family members" ON public.family_members FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Trip participants join table
CREATE TABLE public.trip_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  family_member_id uuid NOT NULL REFERENCES public.family_members(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(trip_id, family_member_id)
);

ALTER TABLE public.trip_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own trip participants" ON public.trip_participants FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.trips WHERE id = trip_id AND user_id = auth.uid())
  OR is_trip_collaborator(auth.uid(), trip_id)
);
CREATE POLICY "Users can insert own trip participants" ON public.trip_participants FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM public.trips WHERE id = trip_id AND user_id = auth.uid())
);
CREATE POLICY "Users can delete own trip participants" ON public.trip_participants FOR DELETE TO authenticated USING (
  EXISTS (SELECT 1 FROM public.trips WHERE id = trip_id AND user_id = auth.uid())
);

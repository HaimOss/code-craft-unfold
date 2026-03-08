
-- Add budget column to trips
ALTER TABLE public.trips ADD COLUMN budget numeric DEFAULT NULL;

-- Create trip_collaborators table
CREATE TABLE public.trip_collaborators (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  trip_id uuid NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  user_id uuid DEFAULT NULL,
  invited_email text DEFAULT NULL,
  invite_token text UNIQUE DEFAULT replace(gen_random_uuid()::text, '-', ''),
  role text NOT NULL DEFAULT 'editor' CHECK (role IN ('editor', 'viewer')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.trip_collaborators ENABLE ROW LEVEL SECURITY;

-- Security definer function to check if user is collaborator on a trip
CREATE OR REPLACE FUNCTION public.is_trip_collaborator(_user_id uuid, _trip_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.trip_collaborators
    WHERE trip_id = _trip_id AND user_id = _user_id AND status = 'accepted'
  );
$$;

-- Security definer function to check if user owns a trip
CREATE OR REPLACE FUNCTION public.is_trip_owner(_user_id uuid, _trip_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.trips WHERE id = _trip_id AND user_id = _user_id
  );
$$;

-- RLS for trip_collaborators
CREATE POLICY "Trip owners can manage collaborators"
  ON public.trip_collaborators FOR ALL
  USING (public.is_trip_owner(auth.uid(), trip_id));

CREATE POLICY "Collaborators can view their own records"
  ON public.trip_collaborators FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Anyone can view by invite token"
  ON public.trip_collaborators FOR SELECT
  USING (true);

-- Update trips RLS to allow collaborators to view
CREATE POLICY "Collaborators can view shared trips"
  ON public.trips FOR SELECT
  USING (public.is_trip_collaborator(auth.uid(), id));

CREATE POLICY "Collaborators can update shared trips"
  ON public.trips FOR UPDATE
  USING (public.is_trip_collaborator(auth.uid(), id));

-- Update events RLS to allow collaborators
CREATE POLICY "Collaborators can view shared events"
  ON public.events FOR SELECT
  USING (public.is_trip_collaborator(auth.uid(), trip_id));

CREATE POLICY "Collaborators can insert shared events"
  ON public.events FOR INSERT
  WITH CHECK (public.is_trip_collaborator(auth.uid(), trip_id));

CREATE POLICY "Collaborators can update shared events"
  ON public.events FOR UPDATE
  USING (public.is_trip_collaborator(auth.uid(), trip_id));

CREATE POLICY "Collaborators can delete shared events"
  ON public.events FOR DELETE
  USING (public.is_trip_collaborator(auth.uid(), trip_id));

-- Enable realtime for trips and events
ALTER PUBLICATION supabase_realtime ADD TABLE public.trips;
ALTER PUBLICATION supabase_realtime ADD TABLE public.events;

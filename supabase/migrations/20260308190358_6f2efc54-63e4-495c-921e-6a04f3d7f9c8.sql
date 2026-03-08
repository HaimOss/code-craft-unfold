
-- 1. Create security definer function for invite token lookup
CREATE OR REPLACE FUNCTION public.get_collaborator_by_invite_token(_token text)
RETURNS SETOF public.trip_collaborators
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM public.trip_collaborators WHERE invite_token = _token;
$$;

-- 2. Create security definer function for shared item token lookup
CREATE OR REPLACE FUNCTION public.get_shared_item_by_token(_token text)
RETURNS SETOF public.shared_items
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM public.shared_items WHERE share_token = _token;
$$;

-- =============================================
-- DROP ALL EXISTING RESTRICTIVE POLICIES
-- =============================================

-- checklist_items
DROP POLICY IF EXISTS "Collaborators can delete shared checklist items" ON public.checklist_items;
DROP POLICY IF EXISTS "Collaborators can insert shared checklist items" ON public.checklist_items;
DROP POLICY IF EXISTS "Collaborators can update shared checklist items" ON public.checklist_items;
DROP POLICY IF EXISTS "Collaborators can view shared checklist items" ON public.checklist_items;
DROP POLICY IF EXISTS "Users can delete own checklist items" ON public.checklist_items;
DROP POLICY IF EXISTS "Users can insert own checklist items" ON public.checklist_items;
DROP POLICY IF EXISTS "Users can update own checklist items" ON public.checklist_items;
DROP POLICY IF EXISTS "Users can view own checklist items" ON public.checklist_items;

-- events
DROP POLICY IF EXISTS "Collaborators can delete shared events" ON public.events;
DROP POLICY IF EXISTS "Collaborators can insert shared events" ON public.events;
DROP POLICY IF EXISTS "Collaborators can update shared events" ON public.events;
DROP POLICY IF EXISTS "Collaborators can view shared events" ON public.events;
DROP POLICY IF EXISTS "Users can delete own events" ON public.events;
DROP POLICY IF EXISTS "Users can insert own events" ON public.events;
DROP POLICY IF EXISTS "Users can update own events" ON public.events;
DROP POLICY IF EXISTS "Users can view own events" ON public.events;

-- notifications
DROP POLICY IF EXISTS "Service role can insert notifications" ON public.notifications;
DROP POLICY IF EXISTS "System can insert notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can delete own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;

-- profiles
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;

-- shared_items
DROP POLICY IF EXISTS "Anyone can view shared items by token" ON public.shared_items;
DROP POLICY IF EXISTS "Users can delete own shared items" ON public.shared_items;
DROP POLICY IF EXISTS "Users can insert own shared items" ON public.shared_items;
DROP POLICY IF EXISTS "Users can view own shared items" ON public.shared_items;

-- trip_collaborators
DROP POLICY IF EXISTS "Anyone can view by invite token" ON public.trip_collaborators;
DROP POLICY IF EXISTS "Collaborators can view their own records" ON public.trip_collaborators;
DROP POLICY IF EXISTS "Trip owners can manage collaborators" ON public.trip_collaborators;

-- trips
DROP POLICY IF EXISTS "Collaborators can update shared trips" ON public.trips;
DROP POLICY IF EXISTS "Collaborators can view shared trips" ON public.trips;
DROP POLICY IF EXISTS "Users can delete own trips" ON public.trips;
DROP POLICY IF EXISTS "Users can insert own trips" ON public.trips;
DROP POLICY IF EXISTS "Users can update own trips" ON public.trips;
DROP POLICY IF EXISTS "Users can view own trips" ON public.trips;

-- =============================================
-- RECREATE ALL AS PERMISSIVE
-- =============================================

-- checklist_items
CREATE POLICY "Users can view own checklist items" ON public.checklist_items FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Collaborators can view shared checklist items" ON public.checklist_items FOR SELECT USING (is_trip_collaborator(auth.uid(), trip_id));
CREATE POLICY "Users can insert own checklist items" ON public.checklist_items FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Collaborators can insert shared checklist items" ON public.checklist_items FOR INSERT WITH CHECK (is_trip_collaborator(auth.uid(), trip_id));
CREATE POLICY "Users can update own checklist items" ON public.checklist_items FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Collaborators can update shared checklist items" ON public.checklist_items FOR UPDATE USING (is_trip_collaborator(auth.uid(), trip_id));
CREATE POLICY "Users can delete own checklist items" ON public.checklist_items FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Collaborators can delete shared checklist items" ON public.checklist_items FOR DELETE USING (is_trip_collaborator(auth.uid(), trip_id));

-- events
CREATE POLICY "Users can view own events" ON public.events FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Collaborators can view shared events" ON public.events FOR SELECT USING (is_trip_collaborator(auth.uid(), trip_id));
CREATE POLICY "Users can insert own events" ON public.events FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Collaborators can insert shared events" ON public.events FOR INSERT WITH CHECK (is_trip_collaborator(auth.uid(), trip_id));
CREATE POLICY "Users can update own events" ON public.events FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Collaborators can update shared events" ON public.events FOR UPDATE USING (is_trip_collaborator(auth.uid(), trip_id));
CREATE POLICY "Users can delete own events" ON public.events FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Collaborators can delete shared events" ON public.events FOR DELETE USING (is_trip_collaborator(auth.uid(), trip_id));

-- notifications
CREATE POLICY "Users can view own notifications" ON public.notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own notifications" ON public.notifications FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own notifications" ON public.notifications FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own notifications" ON public.notifications FOR DELETE USING (auth.uid() = user_id);

-- profiles
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- shared_items (NO public access - use security definer function for token lookup)
CREATE POLICY "Users can view own shared items" ON public.shared_items FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own shared items" ON public.shared_items FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own shared items" ON public.shared_items FOR DELETE USING (auth.uid() = user_id);

-- trip_collaborators (NO public access - use security definer function for token lookup)
CREATE POLICY "Collaborators can view their own records" ON public.trip_collaborators FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Trip owners can manage collaborators" ON public.trip_collaborators FOR ALL USING (is_trip_owner(auth.uid(), trip_id));

-- trips
CREATE POLICY "Users can view own trips" ON public.trips FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Collaborators can view shared trips" ON public.trips FOR SELECT USING (is_trip_collaborator(auth.uid(), id));
CREATE POLICY "Users can insert own trips" ON public.trips FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own trips" ON public.trips FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Collaborators can update shared trips" ON public.trips FOR UPDATE USING (is_trip_collaborator(auth.uid(), id));
CREATE POLICY "Users can delete own trips" ON public.trips FOR DELETE USING (auth.uid() = user_id);

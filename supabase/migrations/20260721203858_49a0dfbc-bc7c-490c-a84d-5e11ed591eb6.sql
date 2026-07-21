
-- 1) cover-images: ownership check on INSERT + drop broad SELECT listing
DROP POLICY IF EXISTS "Authenticated users can upload cover images" ON storage.objects;
CREATE POLICY "Users can upload own cover images"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'cover-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Anyone can view cover images" ON storage.objects;
-- Public bucket serves files by direct URL; no SELECT policy needed for that.
-- Add a scoped SELECT so owners can still list/manage their own files via API.
CREATE POLICY "Users can list own cover images"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'cover-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- 2) saved_activities: remove is_public bypass on SELECT
DROP POLICY IF EXISTS "Users can view own saved activities" ON public.saved_activities;
CREATE POLICY "Users can view own saved activities"
  ON public.saved_activities FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- 3) Harden accept_invite: require the signed-in user's email to match the invite
CREATE OR REPLACE FUNCTION public.accept_invite(_token text, _user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _caller uuid := auth.uid();
  _caller_email text;
  _invite_email text;
BEGIN
  IF _caller IS NULL OR _caller <> _user_id THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  SELECT email INTO _caller_email FROM auth.users WHERE id = _caller;
  SELECT invited_email INTO _invite_email
    FROM public.trip_collaborators
   WHERE invite_token = _token AND status = 'pending';

  IF _invite_email IS NULL THEN
    RAISE EXCEPTION 'Invalid or already used invite token';
  END IF;

  IF lower(_invite_email) <> lower(coalesce(_caller_email, '')) THEN
    RAISE EXCEPTION 'This invite is for a different email address';
  END IF;

  UPDATE public.trip_collaborators
     SET user_id = _caller, status = 'accepted'
   WHERE invite_token = _token AND status = 'pending';
END;
$function$;

-- 4) Revoke EXECUTE on internal SECURITY DEFINER helpers from anon/authenticated
REVOKE ALL ON FUNCTION public.is_trip_owner(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.is_trip_collaborator(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.validate_shared_item_expires_at() FROM PUBLIC, anon, authenticated;

-- Keep RPC-callable functions available to the roles that need them
REVOKE ALL ON FUNCTION public.accept_invite(text, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.accept_invite(text, uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.get_collaborator_by_invite_token(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_collaborator_by_invite_token(text) TO anon, authenticated;

REVOKE ALL ON FUNCTION public.get_shared_item_by_token(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_shared_item_by_token(text) TO anon, authenticated;

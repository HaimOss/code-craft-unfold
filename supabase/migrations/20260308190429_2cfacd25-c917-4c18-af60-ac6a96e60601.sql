
CREATE OR REPLACE FUNCTION public.accept_invite(_token text, _user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.trip_collaborators
  SET user_id = _user_id, status = 'accepted'
  WHERE invite_token = _token AND status = 'pending';
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid or already used invite token';
  END IF;
END;
$$;

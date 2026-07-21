GRANT EXECUTE ON FUNCTION public.is_trip_collaborator(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_trip_owner(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_collaborator_by_invite_token(text) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_shared_item_by_token(text) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.accept_invite(text, uuid) TO authenticated;
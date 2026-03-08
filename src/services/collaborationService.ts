import { supabase } from '@/integrations/supabase/client';
import { TripCollaborator } from '@/types';

export const fetchCollaborators = async (tripId: string): Promise<TripCollaborator[]> => {
  const { data, error } = await supabase
    .from('trip_collaborators')
    .select('*')
    .eq('trip_id', tripId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return (data || []) as TripCollaborator[];
};

export const inviteCollaborator = async (
  tripId: string,
  email: string,
  role: 'editor' | 'viewer' = 'editor'
): Promise<string> => {
  const { data, error } = await supabase
    .from('trip_collaborators')
    .insert([{
      trip_id: tripId,
      invited_email: email,
      role,
    }])
    .select('invite_token')
    .single();

  if (error) throw error;
  return data.invite_token;
};

export const getInviteByToken = async (token: string): Promise<TripCollaborator | null> => {
  const { data, error } = await supabase
    .rpc('get_collaborator_by_invite_token', { _token: token });

  if (error || !data || data.length === 0) return null;
  return data[0] as TripCollaborator;
};

export const acceptInvite = async (token: string, userId: string): Promise<void> => {
  const { error } = await supabase
    .rpc('accept_invite', { _token: token, _user_id: userId });

  if (error) throw error;
};

export const removeCollaborator = async (collaboratorId: string): Promise<void> => {
  const { error } = await supabase
    .from('trip_collaborators')
    .delete()
    .eq('id', collaboratorId);

  if (error) throw error;
};

export const fetchSharedTrips = async (userId: string) => {
  const { data, error } = await supabase
    .from('trip_collaborators')
    .select('trip_id')
    .eq('user_id', userId)
    .eq('status', 'accepted');

  if (error) throw error;
  return (data || []).map(d => d.trip_id);
};

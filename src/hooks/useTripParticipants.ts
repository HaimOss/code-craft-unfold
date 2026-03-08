import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export function useTripParticipants(tripId: string | undefined) {
  const [participantIds, setParticipantIds] = useState<string[]>([]);

  useEffect(() => {
    if (!tripId) return;
    supabase
      .from('trip_participants')
      .select('family_member_id')
      .eq('trip_id', tripId)
      .then(({ data }) => {
        if (data) setParticipantIds(data.map(d => d.family_member_id));
      });
  }, [tripId]);

  const saveParticipants = async (tripId: string, memberIds: string[]) => {
    // Delete existing
    await supabase.from('trip_participants').delete().eq('trip_id', tripId);
    // Insert new
    if (memberIds.length > 0) {
      await supabase.from('trip_participants').insert(
        memberIds.map(fid => ({ trip_id: tripId, family_member_id: fid }))
      );
    }
  };

  return { participantIds, setParticipantIds, saveParticipants };
}

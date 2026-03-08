import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';

interface FamilyMember {
  id: string;
  name: string;
  avatar_emoji: string;
}

interface TripParticipantsPickerProps {
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}

const TripParticipantsPicker: React.FC<TripParticipantsPickerProps> = ({ selectedIds, onChange }) => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [members, setMembers] = useState<FamilyMember[]>([]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from('family_members')
      .select('id, name, avatar_emoji')
      .eq('user_id', user.id)
      .order('created_at')
      .then(({ data }) => {
        if (data) setMembers(data.map(d => ({ id: d.id, name: d.name, avatar_emoji: d.avatar_emoji || '👤' })));
      });
  }, [user]);

  if (members.length === 0) return null;

  const toggle = (id: string) => {
    onChange(
      selectedIds.includes(id)
        ? selectedIds.filter(i => i !== id)
        : [...selectedIds, id]
    );
  };

  return (
    <div>
      <label className="text-xs text-muted-foreground font-medium">{t('family.participants')}</label>
      <div className="flex flex-wrap gap-2 mt-1.5">
        {members.map(member => {
          const selected = selectedIds.includes(member.id);
          return (
            <button
              key={member.id}
              type="button"
              onClick={() => toggle(member.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm transition-colors border ${
                selected
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-secondary text-foreground border-border hover:bg-secondary/80'
              }`}
            >
              <span>{member.avatar_emoji}</span>
              <span>{member.name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default TripParticipantsPicker;

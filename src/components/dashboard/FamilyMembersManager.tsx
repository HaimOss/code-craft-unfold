import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { toast } from '@/hooks/use-toast';
import { Users, Plus, Trash2, X } from 'lucide-react';

interface FamilyMember {
  id: string;
  name: string;
  avatar_emoji: string;
}

const EMOJI_OPTIONS = ['👤', '👩', '👨', '👧', '👦', '👶', '🧓', '👵', '👴', '🐶', '🐱'];

interface FamilyMembersManagerProps {
  compact?: boolean;
}

const FamilyMembersManager: React.FC<FamilyMembersManagerProps> = ({ compact = false }) => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [newName, setNewName] = useState('');
  const [newEmoji, setNewEmoji] = useState('👤');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    loadMembers();
  }, [user]);

  const loadMembers = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from('family_members')
      .select('id, name, avatar_emoji')
      .eq('user_id', user.id)
      .order('created_at');
    if (error) {
      console.error('Error loading family members:', error);
    } else {
      setMembers((data || []).map(d => ({ id: d.id, name: d.name, avatar_emoji: d.avatar_emoji || '👤' })));
    }
    setLoading(false);
  };

  const handleAdd = async () => {
    if (!newName.trim() || !user) return;
    const { data, error } = await supabase
      .from('family_members')
      .insert({ user_id: user.id, name: newName.trim(), avatar_emoji: newEmoji })
      .select('id, name, avatar_emoji')
      .single();
    if (error) {
      toast({ title: t('settings.saveError'), description: error.message, variant: 'destructive' });
    } else if (data) {
      setMembers(prev => [...prev, { id: data.id, name: data.name, avatar_emoji: data.avatar_emoji || '👤' }]);
      setNewName('');
      setNewEmoji('👤');
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('family_members').delete().eq('id', id);
    if (error) {
      toast({ title: t('settings.saveError'), description: error.message, variant: 'destructive' });
    } else {
      setMembers(prev => prev.filter(m => m.id !== id));
    }
  };

  if (loading) return null;

  return (
    <section className="rounded-xl border border-border bg-card p-5 space-y-4">
      <h2 className="text-lg font-semibold flex items-center gap-2">
        <Users className="h-5 w-5 text-primary" />
        {t('family.title')}
      </h2>
      <p className="text-sm text-muted-foreground">{t('family.description')}</p>

      {/* Members list */}
      <div className="space-y-2">
        {members.map(member => (
          <div key={member.id} className="flex items-center gap-3 bg-secondary/50 rounded-lg p-2.5">
            <span className="text-xl">{member.avatar_emoji}</span>
            <span className="flex-1 text-sm font-medium">{member.name}</span>
            <button
              onClick={() => handleDelete(member.id)}
              className="text-muted-foreground hover:text-destructive transition-colors p-1"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
        {members.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-2">{t('family.noMembers')}</p>
        )}
      </div>

      {/* Add new member */}
      <div className="flex items-center gap-2">
        <div className="relative">
          <button
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center text-lg hover:bg-secondary/80 transition-colors"
          >
            {newEmoji}
          </button>
          {showEmojiPicker && (
            <div className="absolute top-full mt-1 z-10 bg-card border border-border rounded-lg p-2 shadow-lg grid grid-cols-4 gap-1">
              {EMOJI_OPTIONS.map(emoji => (
                <button
                  key={emoji}
                  onClick={() => { setNewEmoji(emoji); setShowEmojiPicker(false); }}
                  className="w-8 h-8 rounded hover:bg-secondary flex items-center justify-center text-lg"
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}
        </div>
        <input
          type="text"
          value={newName}
          onChange={e => setNewName(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleAdd(); }}
          placeholder={t('family.namePlaceholder')}
          className="input-field flex-1"
          dir="auto"
        />
        <button
          onClick={handleAdd}
          disabled={!newName.trim()}
          className="btn-primary px-3 py-2 text-sm flex items-center gap-1 disabled:opacity-50"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
    </section>
  );
};

export default FamilyMembersManager;
export type { FamilyMember };

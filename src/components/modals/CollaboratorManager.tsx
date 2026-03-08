import React, { useState, useEffect } from 'react';
import { TripCollaborator } from '@/types';
import { fetchCollaborators, inviteCollaborator, removeCollaborator } from '@/services/collaborationService';
import { toast } from '@/hooks/use-toast';
import { X, UserPlus, Users, Trash2, Copy, Check, Loader2, Mail } from 'lucide-react';

interface CollaboratorManagerProps {
  isOpen: boolean;
  onClose: () => void;
  tripId: string;
  tripName: string;
}

const CollaboratorManager: React.FC<CollaboratorManagerProps> = ({ isOpen, onClose, tripId, tripName }) => {
  const [collaborators, setCollaborators] = useState<TripCollaborator[]>([]);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'editor' | 'viewer'>('editor');
  const [loading, setLoading] = useState(false);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) loadCollaborators();
  }, [isOpen, tripId]);

  const loadCollaborators = async () => {
    try {
      const data = await fetchCollaborators(tripId);
      setCollaborators(data);
    } catch { /* ignore */ }
  };

  const handleInvite = async () => {
    if (!email.trim()) return;
    setLoading(true);
    try {
      const token = await inviteCollaborator(tripId, email.trim(), role);
      const inviteUrl = `${window.location.origin}/invite/${token}`;
      await navigator.clipboard.writeText(inviteUrl);
      toast({ title: 'הזמנה נוצרה והקישור הועתק! 🎉' });
      setEmail('');
      loadCollaborators();
    } catch (err: any) {
      toast({ title: 'שגיאה', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (id: string) => {
    try {
      await removeCollaborator(id);
      setCollaborators(prev => prev.filter(c => c.id !== id));
      toast({ title: 'שותף הוסר' });
    } catch (err: any) {
      toast({ title: 'שגיאה', description: err.message, variant: 'destructive' });
    }
  };

  const handleCopyLink = async (token: string) => {
    const url = `${window.location.origin}/invite/${token}`;
    await navigator.clipboard.writeText(url);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content max-w-lg" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold font-display flex items-center gap-2">
            <Users className="h-5 w-5" /> שיתוף "{tripName}"
          </h2>
          <button onClick={onClose} className="btn-ghost p-1"><X className="h-5 w-5" /></button>
        </div>

        {/* Invite form */}
        <div className="flex gap-2 mb-6">
          <input
            type="email"
            placeholder="אימייל..."
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="input-field flex-grow"
            dir="ltr"
          />
          <select value={role} onChange={e => setRole(e.target.value as 'editor' | 'viewer')} className="input-field w-24">
            <option value="editor">עורך</option>
            <option value="viewer">צופה</option>
          </select>
          <button onClick={handleInvite} disabled={loading} className="btn-primary flex items-center gap-1 whitespace-nowrap">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
            הזמן
          </button>
        </div>

        {/* Collaborators list */}
        <div className="space-y-2">
          {collaborators.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-4">עדיין אין שותפים לטיול</p>
          ) : (
            collaborators.map(c => (
              <div key={c.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm" dir="ltr">{c.invited_email || 'משתמש רשום'}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    c.status === 'accepted' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                    c.status === 'pending' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                    'bg-red-100 text-red-700'
                  }`}>
                    {c.status === 'accepted' ? 'מאושר' : c.status === 'pending' ? 'ממתין' : 'נדחה'}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    ({c.role === 'editor' ? 'עורך' : 'צופה'})
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  {c.status === 'pending' && (
                    <button onClick={() => handleCopyLink(c.invite_token)} className="btn-ghost p-1.5" title="העתק קישור הזמנה">
                      {copiedToken === c.invite_token ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
                    </button>
                  )}
                  <button onClick={() => handleRemove(c.id)} className="btn-ghost p-1.5 text-destructive" title="הסר">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default CollaboratorManager;

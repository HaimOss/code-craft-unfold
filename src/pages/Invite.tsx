import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { getInviteByToken, acceptInvite } from '@/services/collaborationService';
import { toast } from '@/hooks/use-toast';
import { Loader2, UserCheck, LogIn, AlertCircle } from 'lucide-react';

const Invite = () => {
  const { token } = useParams<{ token: string }>();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [invite, setInvite] = useState<any>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!token) return;
    getInviteByToken(token).then(data => {
      if (!data) { setNotFound(true); setLoading(false); return; }
      setInvite(data);
      setLoading(false);
    });
  }, [token]);

  const handleAccept = async () => {
    if (!user || !token) return;
    setAccepting(true);
    try {
      await acceptInvite(token, user.id);
      toast({ title: 'הצטרפת לטיול בהצלחה! 🎉' });
      navigate('/');
    } catch (err: any) {
      toast({ title: 'שגיאה', description: err.message, variant: 'destructive' });
    } finally {
      setAccepting(false);
    }
  };

  if (loading || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="text-center max-w-md">
          <AlertCircle className="h-16 w-16 text-destructive mx-auto mb-4" />
          <h1 className="text-2xl font-bold font-display mb-2">הזמנה לא נמצאה</h1>
          <p className="text-muted-foreground mb-6">הקישור לא תקין או שכבר נוצל.</p>
          <button onClick={() => navigate('/')} className="btn-primary">חזור לדף הבית</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-card rounded-2xl shadow-lg p-8 border border-border text-center">
        <UserCheck className="h-12 w-12 text-primary mx-auto mb-4" />
        <h1 className="text-2xl font-bold font-display mb-2">הוזמנת לטיול!</h1>
        <p className="text-muted-foreground mb-2">
          הוזמנת כ{invite?.role === 'editor' ? 'עורך' : 'צופה'} לטיול משותף
        </p>
        {invite?.invited_email && (
          <p className="text-sm text-muted-foreground mb-6" dir="ltr">{invite.invited_email}</p>
        )}

        {!user ? (
          <button onClick={() => navigate('/auth')} className="btn-primary w-full flex items-center justify-center gap-2">
            <LogIn className="h-4 w-4" /> התחבר כדי להצטרף
          </button>
        ) : (
          <button onClick={handleAccept} disabled={accepting} className="btn-primary w-full flex items-center justify-center gap-2">
            {accepting ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserCheck className="h-4 w-4" />}
            {accepting ? 'מצטרף...' : 'הצטרף לטיול'}
          </button>
        )}
      </div>
    </div>
  );
};

export default Invite;

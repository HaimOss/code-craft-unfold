import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Compass, Lock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const ResetPassword = () => {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const hash = window.location.hash;
    if (hash && hash.includes('type=recovery')) {
      // Supabase will auto-set session from the hash
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const { error } = await supabase.auth.updateUser({ password });
    if (error) setError(error.message);
    else {
      setMessage('הסיסמה עודכנה בהצלחה!');
      setTimeout(() => navigate('/'), 2000);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-2">
            <Compass className="h-10 w-10 text-accent" />
            <h1 className="text-4xl font-bold font-display text-foreground">WonderJourney</h1>
          </div>
        </div>
        <div className="card-surface p-8">
          <h2 className="text-2xl font-bold font-display mb-6 text-center">סיסמה חדשה</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input type="password" placeholder="סיסמה חדשה" value={password} onChange={e => setPassword(e.target.value)} className="pl-10" required minLength={6} />
            </div>
            {error && <p className="text-sm text-destructive bg-destructive/10 rounded-lg p-3">{error}</p>}
            {message && <p className="text-sm text-green-600 bg-green-50 dark:bg-green-900/20 rounded-lg p-3">{message}</p>}
            <button type="submit" disabled={loading} className="btn-primary w-full">{loading ? 'מעדכן...' : 'עדכן סיסמה'}</button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;

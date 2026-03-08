import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Compass, Mail, ArrowLeft, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';

const ForgotPassword = () => {
  const { t, isRTL } = useLanguage();
  const [email, setEmail] = useState(''); const [loading, setLoading] = useState(false); const [message, setMessage] = useState(''); const [error, setError] = useState('');
  const navigate = useNavigate();
  const BackArrow = isRTL ? ArrowRight : ArrowLeft;
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true); setError('');
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset-password` });
    if (error) setError(error.message); else setMessage(t('auth.resetEmailSent')); setLoading(false);
  };
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8"><div className="flex items-center justify-center gap-3 mb-2"><Compass className="h-10 w-10 text-accent" /><h1 className="text-4xl font-bold font-display text-foreground">WonderJourney</h1></div></div>
        <div className="card-surface p-8">
          <h2 className="text-2xl font-bold font-display mb-6 text-center">{t('auth.resetPassword')}</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative"><Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input type="email" placeholder={t('auth.email')} value={email} onChange={e => setEmail(e.target.value)} className="pl-10" required /></div>
            {error && <p className="text-sm text-destructive bg-destructive/10 rounded-lg p-3">{error}</p>}
            {message && <p className="text-sm text-green-600 bg-green-50 dark:bg-green-900/20 rounded-lg p-3">{message}</p>}
            <button type="submit" disabled={loading} className="btn-primary w-full">{loading ? t('auth.sending') : t('auth.sendResetLink')}</button>
          </form>
          <button onClick={() => navigate('/auth')} className="mt-4 w-full flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <BackArrow className="h-4 w-4" /> {t('auth.backToLogin')}
          </button>
        </div>
      </div>
    </div>
  );
};
export default ForgotPassword;

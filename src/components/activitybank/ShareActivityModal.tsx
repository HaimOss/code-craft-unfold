import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import type { SavedActivity } from './ActivityBank';

interface ShareActivityModalProps {
  isOpen: boolean;
  onClose: () => void;
  activity: SavedActivity;
}

const ShareActivityModal: React.FC<ShareActivityModalProps> = ({ isOpen, onClose, activity }) => {
  const { t, dir } = useLanguage();
  const { user } = useAuth();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleShare = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !email.trim()) return;
    setLoading(true);
    try {
      const { error } = await supabase.from('activity_shares').insert({
        activity_id: activity.id,
        shared_by: user.id,
        shared_with_email: email.trim().toLowerCase(),
      });
      if (error) throw error;
      toast({ title: t('activityBank.shared') });
      setEmail('');
      onClose();
    } catch (err: any) {
      toast({ title: t('activityBank.shareError'), description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-sm" dir={dir}>
        <DialogHeader>
          <DialogTitle>{t('activityBank.shareActivity')}</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground mb-2">
          {t('activityBank.shareDesc')} <strong>{activity.title}</strong>
        </p>
        <form onSubmit={handleShare} className="space-y-4">
          <div>
            <Label>{t('activityBank.recipientEmail')}</Label>
            <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="friend@email.com" required />
          </div>
          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={onClose}>{t('activityBank.cancel')}</Button>
            <Button type="submit" disabled={loading}>{t('activityBank.send')}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ShareActivityModal;

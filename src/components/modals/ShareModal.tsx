import React, { useState } from 'react';
import { Copy, Check, X, Send, Link, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { createShareLink } from '@/services/shareService';
import { Trip, Event } from '@/types';
import { toast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/LanguageContext';

interface ShareModalProps { isOpen: boolean; onClose: () => void; shareUrl?: string; title: string; itemType?: 'trip' | 'event'; itemData?: Trip | Event; }

const ShareModal: React.FC<ShareModalProps> = ({ isOpen, onClose, shareUrl: initialUrl, title, itemType, itemData }) => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [copied, setCopied] = useState(false);
  const [shareUrl, setShareUrl] = useState(initialUrl || '');
  const [generating, setGenerating] = useState(false);
  if (!isOpen) return null;
  const handleCopy = async () => { await navigator.clipboard.writeText(shareUrl); setCopied(true); setTimeout(() => setCopied(false), 2000); };
  const handleGenerateLink = async () => {
    if (!user || !itemType || !itemData) return; setGenerating(true);
    try { const token = await createShareLink(user.id, itemType, itemData); const url = `${window.location.origin}/import/${token}`; setShareUrl(url); toast({ title: t('share.linkGenerated') }); } catch (err: any) { toast({ title: t('toast.error'), description: err.message, variant: 'destructive' }); } finally { setGenerating(false); }
  };
  const handleWhatsApp = () => { window.open(`https://wa.me/?text=${encodeURIComponent(`${t('share.checkItOut')} ${shareUrl}`)}`, '_blank'); };
  const handleEmail = () => { window.open(`mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(`${t('share.checkItOut')}: ${shareUrl}`)}`, '_blank'); };
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content max-w-md" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold font-display">{title}</h2>
          <button onClick={onClose} className="btn-ghost p-1"><X className="h-5 w-5" /></button>
        </div>
        {itemType && itemData && !shareUrl && (
          <button onClick={handleGenerateLink} disabled={generating} className="btn-primary w-full flex items-center justify-center gap-2 mb-4">
            {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link className="h-4 w-4" />}
            {generating ? t('share.generatingLink') : t('share.generateLink')}
          </button>
        )}
        {shareUrl && (
          <>
            <div className="flex items-center gap-2 mb-4">
              <input value={shareUrl} readOnly className="input-field text-sm flex-grow" dir="ltr" />
              <button onClick={handleCopy} className="btn-primary flex items-center gap-1 whitespace-nowrap">
                {copied ? <><Check className="h-4 w-4" /> {t('share.copied')}</> : <><Copy className="h-4 w-4" /> {t('share.copy')}</>}
              </button>
            </div>
            <div className="flex gap-3">
              <button onClick={handleWhatsApp} className="btn-secondary flex-1 flex items-center justify-center gap-2"><Send className="h-4 w-4" /> WhatsApp</button>
              <button onClick={handleEmail} className="btn-secondary flex-1 flex items-center justify-center gap-2"><Send className="h-4 w-4" /> Email</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
export default ShareModal;

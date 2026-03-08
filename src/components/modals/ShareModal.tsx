import React, { useState } from 'react';
import { Copy, Check, X, Send } from 'lucide-react';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  shareUrl: string;
  title: string;
}

const ShareModal: React.FC<ShareModalProps> = ({ isOpen, onClose, shareUrl, title }) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleWhatsApp = () => {
    window.open(`https://wa.me/?text=${encodeURIComponent(`Check out my trip! ${shareUrl}`)}`, '_blank');
  };

  const handleEmail = () => {
    window.open(`mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(`Check this out: ${shareUrl}`)}`, '_blank');
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content max-w-md" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold font-display">{title}</h2>
          <button onClick={onClose} className="btn-ghost p-1"><X className="h-5 w-5" /></button>
        </div>

        <div className="flex items-center gap-2 mb-4">
          <input value={shareUrl} readOnly className="input-field text-sm flex-grow" />
          <button onClick={handleCopy} className="btn-primary flex items-center gap-1 whitespace-nowrap">
            {copied ? <><Check className="h-4 w-4" /> Copied!</> : <><Copy className="h-4 w-4" /> Copy</>}
          </button>
        </div>

        <div className="flex gap-3">
          <button onClick={handleWhatsApp} className="btn-secondary flex-1 flex items-center justify-center gap-2">
            <Send className="h-4 w-4" /> WhatsApp
          </button>
          <button onClick={handleEmail} className="btn-secondary flex-1 flex items-center justify-center gap-2">
            <Send className="h-4 w-4" /> Email
          </button>
        </div>
      </div>
    </div>
  );
};

export default ShareModal;

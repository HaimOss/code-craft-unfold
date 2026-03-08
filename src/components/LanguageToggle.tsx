import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Globe } from 'lucide-react';

const LanguageToggle: React.FC = () => {
  const { language, setLanguage } = useLanguage();

  return (
    <button
      onClick={() => setLanguage(language === 'he' ? 'en' : 'he')}
      className="btn-ghost p-2 flex items-center gap-1 text-sm font-medium"
      title={language === 'he' ? 'Switch to English' : 'עבור לעברית'}
    >
      <Globe className="h-4 w-4" />
      <span className="text-xs">{language === 'he' ? 'EN' : 'עב'}</span>
    </button>
  );
};

export default LanguageToggle;

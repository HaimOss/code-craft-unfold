import React, { useState, useEffect, useCallback } from 'react';
import { Accessibility, X, ZoomIn, Contrast, MousePointer2, ScanLine, Type } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

interface A11ySettings { largeText: boolean; highContrast: boolean; largePointer: boolean; lineHeight: boolean; letterSpacing: boolean; }
const DEFAULT: A11ySettings = { largeText: false, highContrast: false, largePointer: false, lineHeight: false, letterSpacing: false };
const STORAGE_KEY = 'a11y-settings';

const AccessibilityToggle: React.FC = () => {
  const { t, dir } = useLanguage();
  const [open, setOpen] = useState(false);
  const [settings, setSettings] = useState<A11ySettings>(() => { try { const s = localStorage.getItem(STORAGE_KEY); return s ? { ...DEFAULT, ...JSON.parse(s) } : DEFAULT; } catch { return DEFAULT; } });
  const applySettings = useCallback((s: A11ySettings) => { const r = document.documentElement; r.classList.toggle('a11y-large-text', s.largeText); r.classList.toggle('a11y-high-contrast', s.highContrast); r.classList.toggle('a11y-large-pointer', s.largePointer); r.classList.toggle('a11y-line-height', s.lineHeight); r.classList.toggle('a11y-letter-spacing', s.letterSpacing); }, []);
  useEffect(() => { applySettings(settings); localStorage.setItem(STORAGE_KEY, JSON.stringify(settings)); }, [settings, applySettings]);
  const toggle = (key: keyof A11ySettings) => setSettings(prev => ({ ...prev, [key]: !prev[key] }));
  const resetAll = () => setSettings(DEFAULT);
  const hasAny = Object.values(settings).some(Boolean);
  const options: { key: keyof A11ySettings; labelKey: string; icon: React.ElementType }[] = [
    { key: 'largeText', labelKey: 'accessibility.largeText', icon: ZoomIn },
    { key: 'highContrast', labelKey: 'accessibility.highContrast', icon: Contrast },
    { key: 'largePointer', labelKey: 'accessibility.largePointer', icon: MousePointer2 },
    { key: 'lineHeight', labelKey: 'accessibility.lineHeight', icon: ScanLine },
    { key: 'letterSpacing', labelKey: 'accessibility.letterSpacing', icon: Type },
  ];
  return (
    <>
      <button onClick={() => setOpen(!open)} className={`fixed bottom-4 left-4 z-50 w-12 h-12 rounded-full shadow-lg flex items-center justify-center transition-all hover:scale-110 ${hasAny ? 'bg-primary text-primary-foreground' : 'bg-card text-foreground border border-border'}`} aria-label={t('accessibility.title')} title={t('accessibility.title')}>
        <Accessibility className="h-5 w-5" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-50 bg-foreground/20 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="fixed bottom-20 left-4 z-50 bg-card border border-border rounded-2xl shadow-2xl w-72 p-5 animate-in slide-in-from-bottom-4 fade-in duration-200" dir={dir}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold font-display flex items-center gap-2"><Accessibility className="h-5 w-5 text-primary" />{t('accessibility.title')}</h3>
              <button onClick={() => setOpen(false)} className="btn-ghost p-1 rounded-full"><X className="h-4 w-4" /></button>
            </div>
            <div className="space-y-2">
              {options.map(({ key, labelKey, icon: Icon }) => (
                <button key={key} onClick={() => toggle(key)} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${settings[key] ? 'bg-primary text-primary-foreground' : 'bg-secondary text-foreground hover:bg-secondary/80'}`}>
                  <Icon className="h-4 w-4 shrink-0" />{t(labelKey)}
                </button>
              ))}
            </div>
            {hasAny && <button onClick={resetAll} className="mt-3 w-full text-center text-xs text-muted-foreground hover:text-destructive transition-colors py-1.5">{t('accessibility.reset')}</button>}
          </div>
        </>
      )}
    </>
  );
};
export default AccessibilityToggle;

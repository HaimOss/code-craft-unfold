import React, { useState, useEffect, useCallback } from 'react';
import { Accessibility, X, ZoomIn, Contrast, MousePointer2, ScanLine, Type } from 'lucide-react';

interface A11ySettings {
  largeText: boolean;
  highContrast: boolean;
  largePointer: boolean;
  lineHeight: boolean;
  letterSpacing: boolean;
}

const DEFAULT: A11ySettings = {
  largeText: false,
  highContrast: false,
  largePointer: false,
  lineHeight: false,
  letterSpacing: false,
};

const STORAGE_KEY = 'a11y-settings';

const AccessibilityToggle: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [settings, setSettings] = useState<A11ySettings>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? { ...DEFAULT, ...JSON.parse(saved) } : DEFAULT;
    } catch {
      return DEFAULT;
    }
  });

  const applySettings = useCallback((s: A11ySettings) => {
    const root = document.documentElement;
    root.classList.toggle('a11y-large-text', s.largeText);
    root.classList.toggle('a11y-high-contrast', s.highContrast);
    root.classList.toggle('a11y-large-pointer', s.largePointer);
    root.classList.toggle('a11y-line-height', s.lineHeight);
    root.classList.toggle('a11y-letter-spacing', s.letterSpacing);
  }, []);

  useEffect(() => {
    applySettings(settings);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  }, [settings, applySettings]);

  const toggle = (key: keyof A11ySettings) => {
    setSettings(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const resetAll = () => {
    setSettings(DEFAULT);
  };

  const hasAny = Object.values(settings).some(Boolean);

  const options = [
    { key: 'largeText' as const, label: 'טקסט גדול', icon: ZoomIn },
    { key: 'highContrast' as const, label: 'ניגודיות גבוהה', icon: Contrast },
    { key: 'largePointer' as const, label: 'סמן גדול', icon: MousePointer2 },
    { key: 'lineHeight' as const, label: 'ריווח שורות', icon: ScanLine },
    { key: 'letterSpacing' as const, label: 'ריווח אותיות', icon: Type },
  ];

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(!open)}
        className={`fixed bottom-4 left-4 z-50 w-12 h-12 rounded-full shadow-lg flex items-center justify-center transition-all hover:scale-110 ${
          hasAny
            ? 'bg-primary text-primary-foreground'
            : 'bg-card text-foreground border border-border'
        }`}
        aria-label="הגדרות נגישות"
        title="נגישות"
      >
        <Accessibility className="h-5 w-5" />
      </button>

      {/* Panel */}
      {open && (
        <>
          <div className="fixed inset-0 z-50 bg-foreground/20 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="fixed bottom-20 left-4 z-50 bg-card border border-border rounded-2xl shadow-2xl w-72 p-5 animate-in slide-in-from-bottom-4 fade-in duration-200" dir="rtl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold font-display flex items-center gap-2">
                <Accessibility className="h-5 w-5 text-primary" />
                נגישות
              </h3>
              <button onClick={() => setOpen(false)} className="btn-ghost p-1 rounded-full">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-2">
              {options.map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => toggle(key)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    settings[key]
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-secondary text-foreground hover:bg-secondary/80'
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {label}
                </button>
              ))}
            </div>

            {hasAny && (
              <button
                onClick={resetAll}
                className="mt-3 w-full text-center text-xs text-muted-foreground hover:text-destructive transition-colors py-1.5"
              >
                איפוס הגדרות נגישות
              </button>
            )}
          </div>
        </>
      )}
    </>
  );
};

export default AccessibilityToggle;

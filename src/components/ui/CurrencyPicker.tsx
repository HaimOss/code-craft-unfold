import React, { useState, useRef, useEffect } from 'react';
import { CURRENCIES, CURRENCY_SYMBOLS } from '@/constants';
import { Search, ChevronDown } from 'lucide-react';

interface CurrencyPickerProps {
  value: string;
  onChange: (currency: string) => void;
  name?: string;
  className?: string;
}

const CurrencyPicker: React.FC<CurrencyPickerProps> = ({ value, onChange, name, className = '' }) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    if (open) {
      setSearch('');
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const filtered = CURRENCIES.filter(c =>
    c.toLowerCase().includes(search.toLowerCase()) ||
    (CURRENCY_SYMBOLS[c] || '').includes(search)
  );

  const symbol = CURRENCY_SYMBOLS[value] || '';

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="input-field w-full flex items-center justify-between gap-1 text-right"
      >
        <span className="font-medium">{symbol} {value}</span>
        <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
      </button>

      {open && (
        <div className="absolute z-50 top-full mt-1 w-full min-w-[180px] bg-popover border border-border rounded-lg shadow-lg overflow-hidden">
          <div className="p-2 border-b border-border">
            <div className="relative">
              <Search className="absolute right-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
              <input
                ref={inputRef}
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="חפש מטבע..."
                className="w-full text-sm bg-muted/50 rounded-md py-1.5 pr-8 pl-2 outline-none placeholder:text-muted-foreground/60"
                dir="rtl"
              />
            </div>
          </div>
          <div className="max-h-48 overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-3">לא נמצא</p>
            ) : (
              filtered.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => { onChange(c); setOpen(false); }}
                  className={`w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-accent/50 transition-colors ${
                    c === value ? 'bg-accent text-accent-foreground font-medium' : ''
                  }`}
                >
                  <span className="text-muted-foreground text-xs">{CURRENCY_SYMBOLS[c] || ''}</span>
                  <span>{c}</span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
      {name && <input type="hidden" name={name} value={value} />}
    </div>
  );
};

export default CurrencyPicker;

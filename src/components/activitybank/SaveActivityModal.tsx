import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useLanguage } from '@/contexts/LanguageContext';
import { EVENT_CATEGORIES, CURRENCIES, CURRENCY_SYMBOLS } from '@/constants';
import type { SavedActivity } from './ActivityBank';

interface SaveActivityModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (activity: Partial<SavedActivity>) => void;
  existingActivity?: SavedActivity | null;
}

const SaveActivityModal: React.FC<SaveActivityModalProps> = ({ isOpen, onClose, onSave, existingActivity }) => {
  const { t, dir } = useLanguage();
  const [form, setForm] = useState({
    title: '',
    category: EVENT_CATEGORIES[3] as string,
    location: '',
    country: '',
    estimated_cost: '',
    currency: 'ILS',
    source_url: '',
    notes: '',
    tags: '',
  });

  useEffect(() => {
    if (existingActivity) {
      setForm({
        title: existingActivity.title,
        category: existingActivity.category,
        location: existingActivity.location || '',
        country: (existingActivity as any).country || '',
        estimated_cost: existingActivity.estimated_cost?.toString() || '',
        currency: existingActivity.currency || 'ILS',
        source_url: existingActivity.source_url || '',
        notes: existingActivity.notes || '',
        tags: existingActivity.tags?.join(', ') || '',
      });
    } else {
      setForm({ title: '', category: EVENT_CATEGORIES[3], location: '', country: '', estimated_cost: '', currency: 'ILS', source_url: '', notes: '', tags: '' });
    }
  }, [existingActivity, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    onSave({
      title: form.title.trim(),
      category: form.category,
      location: form.location.trim() || undefined,
      country: form.country.trim() || undefined,
      estimated_cost: form.estimated_cost ? Number(form.estimated_cost) : undefined,
      currency: form.currency,
      source_url: form.source_url.trim() || undefined,
      notes: form.notes.trim() || undefined,
      tags: form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
    } as any);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md" dir={dir}>
        <DialogHeader>
          <DialogTitle>{existingActivity ? t('activityBank.edit') : t('activityBank.add')}</DialogTitle>
          <DialogDescription className="sr-only">{t('activityBank.description')}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>{t('activityBank.activityName')}</Label>
            <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required />
          </div>

          <div>
            <Label>{t('activityBank.category')}</Label>
            <select
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={form.category}
              onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
            >
              {EVENT_CATEGORIES.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <div>
            <Label>{t('activityBank.location')}</Label>
            <Input value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} placeholder="📍 עיר / כתובת" />
          </div>

          <div>
            <Label>{t('activityBank.country')}</Label>
            <Input value={form.country} onChange={e => setForm(f => ({ ...f, country: e.target.value }))} placeholder="🌍 איטליה, יפן..." />
          </div>

          <div className="flex gap-2">
            <div className="flex-1">
              <Label>{t('activityBank.estimatedCost')}</Label>
              <Input type="number" min="0" step="0.01" value={form.estimated_cost} onChange={e => setForm(f => ({ ...f, estimated_cost: e.target.value }))} />
            </div>
            <div className="w-24">
              <Label>{t('activityBank.currency')}</Label>
              <select
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={form.currency}
                onChange={e => setForm(f => ({ ...f, currency: e.target.value }))}
              >
                {CURRENCIES.map(c => (
                  <option key={c} value={c}>{CURRENCY_SYMBOLS[c] || c} {c}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <Label>{t('activityBank.sourceUrl')}</Label>
            <Input type="url" value={form.source_url} onChange={e => setForm(f => ({ ...f, source_url: e.target.value }))} placeholder="https://..." />
          </div>

          <div>
            <Label>{t('activityBank.tags')}</Label>
            <Input value={form.tags} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))} placeholder={t('activityBank.tagsPlaceholder')} />
          </div>

          <div>
            <Label>{t('activityBank.notes')}</Label>
            <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={3} />
          </div>

          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={onClose}>{t('activityBank.cancel')}</Button>
            <Button type="submit">{existingActivity ? t('activityBank.update') : t('activityBank.save')}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default SaveActivityModal;

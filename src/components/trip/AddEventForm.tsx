import React, { useState } from 'react';
import { Trip, Event, EventCategory, PaymentMethod } from '@/types';
import { EVENT_CATEGORIES, PAYMENT_METHODS, PRESET_TAGS } from '@/constants';
import CurrencyPicker from '@/components/ui/CurrencyPicker';
import { generateId } from '@/utils/helpers';
import { Calendar, Clock, DollarSign, CreditCard, Star, FileText, MapPin, Phone, Globe, Plane, Building, Car, X, Plus, Tag, ShoppingBag, Ticket, ExternalLink, BookmarkPlus } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import ImportFromBankModal from './ImportFromBankModal';

interface AddEventFormProps {
  trip: Trip;
  onAddEvent: (event: Event) => void;
  onUpdateEvent: (event: Event) => void;
  onCancel: () => void;
  existingEvent: Event | null;
  initialDate?: string;
}

const AddEventForm: React.FC<AddEventFormProps> = ({ trip, onAddEvent, onUpdateEvent, onCancel, existingEvent, initialDate }) => {
  const { t } = useLanguage();
  const [formData, setFormData] = useState<Partial<Event>>({
    date: initialDate || new Date().toISOString().split('T')[0],
    time: new Date().toTimeString().substring(0, 5),
    category: EventCategory.General,
    amount: 0,
    currency: trip.base_currency,
    payment_method: PaymentMethod.Credit,
    details: {},
    rating: 0,
    is_favorite: false,
    tags: [],
    ...existingEvent,
  });

  const [customTagInput, setCustomTagInput] = useState('');
  const [showBankModal, setShowBankModal] = useState(false);

  const handleImportFromBank = (activity: any) => {
    setFormData(prev => ({
      ...prev,
      title: activity.title || prev.title,
      category: activity.category || prev.category,
      amount: activity.estimated_cost || 0,
      currency: activity.currency || prev.currency,
      notes: activity.notes || prev.notes,
      tags: activity.tags || prev.tags,
      details: {
        ...(prev.details || {}),
        ...(activity.details || {}),
        location: activity.location || (prev.details as any)?.location,
      },
    }));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    const processedValue = name === 'amount' ? parseFloat(value) || 0 : value;
    setFormData(prev => ({ ...prev, [name]: processedValue }));
  };

  const handleDetailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, details: { ...(prev.details || {}), [name]: value } }));
  };

  const toggleTag = (tag: string) => {
    setFormData(prev => {
      const currentTags = prev.tags || [];
      return { ...prev, tags: currentTags.includes(tag) ? currentTags.filter(t => t !== tag) : [...currentTags, tag] };
    });
  };

  const addCustomTag = () => {
    const tag = customTagInput.trim();
    if (tag && !(formData.tags || []).includes(tag)) {
      setFormData(prev => ({ ...prev, tags: [...(prev.tags || []), tag] }));
      setCustomTagInput('');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const eventData: Partial<Event> = { ...formData };
    if (eventData.rating === 0) delete eventData.rating;
    const completeEvent = { id: existingEvent?.id || generateId(), ...eventData } as Event;
    if (existingEvent) onUpdateEvent(completeEvent);
    else onAddEvent(completeEvent);
  };

  const renderCategoryFields = () => {
    switch (formData.category) {
      case EventCategory.Flights:
        return (
          <>
            <div className="relative"><Plane className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><input name="airline" placeholder="Airline" value={(formData.details as any)?.airline || ''} onChange={handleDetailChange} className="input-field pl-10" /></div>
            <div className="relative"><Plane className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><input name="flight_num" placeholder="Flight Number" value={(formData.details as any)?.flight_num || ''} onChange={handleDetailChange} className="input-field pl-10" /></div>
            <div className="relative"><Plane className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><input name="dept_airport" placeholder="Departure Airport" value={(formData.details as any)?.dept_airport || ''} onChange={handleDetailChange} className="input-field pl-10" /></div>
            <div className="relative"><Plane className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><input name="arr_airport" placeholder="Arrival Airport" value={(formData.details as any)?.arr_airport || ''} onChange={handleDetailChange} className="input-field pl-10" /></div>
            <div className="relative"><FileText className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><input name="confirmation_num" placeholder="Confirmation Number" value={(formData.details as any)?.confirmation_num || ''} onChange={handleDetailChange} className="input-field pl-10" /></div>
            <div className="relative"><Building className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><input name="terminal" placeholder="Terminal" value={(formData.details as any)?.terminal || ''} onChange={handleDetailChange} className="input-field pl-10" /></div>
            <div className="relative"><Building className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><input name="gate" placeholder="Gate" value={(formData.details as any)?.gate || ''} onChange={handleDetailChange} className="input-field pl-10" /></div>
            <div className="relative"><Globe className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><input name="checkin_link" placeholder="Check-in Link" value={(formData.details as any)?.checkin_link || ''} onChange={handleDetailChange} className="input-field pl-10" /></div>
          </>
        );
      case EventCategory.Accommodation:
        return (
          <>
            <div className="relative"><Clock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><input name="check_in" type="time" placeholder="Check-in" value={(formData.details as any)?.check_in || ''} onChange={handleDetailChange} className="input-field pl-10" /></div>
            <div className="relative"><Clock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><input name="check_out" type="time" placeholder="Check-out" value={(formData.details as any)?.check_out || ''} onChange={handleDetailChange} className="input-field pl-10" /></div>
            <div className="relative"><MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><input name="address" placeholder="Address" value={(formData.details as any)?.address || ''} onChange={handleDetailChange} className="input-field pl-10" /></div>
            <div className="relative"><Building className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><input name="room_type" placeholder="Room Type" value={(formData.details as any)?.room_type || ''} onChange={handleDetailChange} className="input-field pl-10" /></div>
            <div className="relative"><FileText className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><input name="confirmation_num" placeholder="Confirmation Number" value={(formData.details as any)?.confirmation_num || ''} onChange={handleDetailChange} className="input-field pl-10" /></div>
            <div className="relative"><Globe className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><input name="book_link" placeholder="Booking Link" value={(formData.details as any)?.book_link || ''} onChange={handleDetailChange} className="input-field pl-10" /></div>
            <div className="relative"><Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><input name="phone" placeholder="Phone" value={(formData.details as any)?.phone || ''} onChange={handleDetailChange} className="input-field pl-10" /></div>
          </>
        );
      case EventCategory.Transport:
        return (
          <>
            <div className="relative">
              <Car className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <select name="transport_type" value={(formData.details as any)?.transport_type || ''} onChange={(e) => handleDetailChange(e as any)} className="input-field pl-10">
                <option value="">Transport Type</option>
                <option value="rental">🚗 Rental Car</option>
                <option value="train">🚆 Train</option>
                <option value="bus">🚌 Bus</option>
                <option value="taxi">🚕 Taxi / Ride</option>
                <option value="ferry">⛴️ Ferry</option>
                <option value="other">📦 Other</option>
              </select>
            </div>
            <div className="relative"><Car className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><input name="pickup_point" placeholder="Pick-up Point" value={(formData.details as any)?.pickup_point || ''} onChange={handleDetailChange} className="input-field pl-10" /></div>
            <div className="relative"><MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><input name="dropoff_point" placeholder="Drop-off Point" value={(formData.details as any)?.dropoff_point || ''} onChange={handleDetailChange} className="input-field pl-10" /></div>
            <div className="relative"><Building className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><input name="company" placeholder="Company" value={(formData.details as any)?.company || ''} onChange={handleDetailChange} className="input-field pl-10" /></div>
            <div className="relative"><FileText className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><input name="confirmation_num" placeholder="Confirmation Number" value={(formData.details as any)?.confirmation_num || ''} onChange={handleDetailChange} className="input-field pl-10" /></div>
            <div className="relative"><Globe className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><input name="book_link" placeholder="Booking Link" value={(formData.details as any)?.book_link || ''} onChange={handleDetailChange} className="input-field pl-10" /></div>
          </>
        );
      case EventCategory.Activity:
        return (
          <>
            <div className="relative"><MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><input name="address" placeholder="Address" value={(formData.details as any)?.address || ''} onChange={handleDetailChange} className="input-field pl-10" /></div>
            <div className="relative"><MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><input name="location" placeholder="Location / Area" value={(formData.details as any)?.location || ''} onChange={handleDetailChange} className="input-field pl-10" /></div>
            <div className="relative"><Clock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><input name="opening_hours" placeholder="Opening Hours" value={(formData.details as any)?.opening_hours || ''} onChange={handleDetailChange} className="input-field pl-10" /></div>
            <div className="relative"><Globe className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><input name="book_link" placeholder="Booking Link" value={(formData.details as any)?.book_link || ''} onChange={handleDetailChange} className="input-field pl-10" /></div>
            <div className="relative"><FileText className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><input name="confirmation_num" placeholder="Confirmation Number" value={(formData.details as any)?.confirmation_num || ''} onChange={handleDetailChange} className="input-field pl-10" /></div>
            <div className="relative"><Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><input name="phone" placeholder="Phone" value={(formData.details as any)?.phone || ''} onChange={handleDetailChange} className="input-field pl-10" /></div>
            <div className="relative"><Globe className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><input name="website" placeholder="Website" value={(formData.details as any)?.website || ''} onChange={handleDetailChange} className="input-field pl-10" /></div>
          </>
        );
      case EventCategory.Shopping:
        return (
          <>
            <div className="relative"><MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><input name="address" placeholder="Address" value={(formData.details as any)?.address || ''} onChange={handleDetailChange} className="input-field pl-10" /></div>
            <div className="relative"><Clock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><input name="opening_hours" placeholder="Opening Hours" value={(formData.details as any)?.opening_hours || ''} onChange={handleDetailChange} className="input-field pl-10" /></div>
            <div className="relative"><Globe className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><input name="website" placeholder="Website" value={(formData.details as any)?.website || ''} onChange={handleDetailChange} className="input-field pl-10" /></div>
            <div className="relative"><FileText className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><input name="customs_note" placeholder="Customs / Returns Note" value={(formData.details as any)?.customs_note || ''} onChange={handleDetailChange} className="input-field pl-10" /></div>
          </>
        );
      default:
        return (
          <>
            <div className="relative"><MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><input name="location" placeholder="Location" value={(formData.details as any)?.location || ''} onChange={handleDetailChange} className="input-field pl-10" /></div>
            <div className="relative"><Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><input name="phone" placeholder="Phone" value={(formData.details as any)?.phone || ''} onChange={handleDetailChange} className="input-field pl-10" /></div>
            <div className="relative"><Globe className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><input name="website" placeholder="Website" value={(formData.details as any)?.website || ''} onChange={handleDetailChange} className="input-field pl-10" /></div>
          </>
        );
    }
  };

  return (
    <div className="card-surface p-6 animate-fade-in">
      <h2 className="text-2xl font-bold font-display mb-4">{existingEvent ? t('eventForm.editEvent') : t('eventForm.addEvent')}</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative"><FileText className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><input name="title" placeholder={t('eventForm.title')} value={formData.title || ''} onChange={handleInputChange} required className="input-field pl-10" /></div>
          <select name="category" value={formData.category} onChange={handleInputChange} className="input-field">{EVENT_CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}</select>
          <div className="relative"><Calendar className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><input name="date" type="date" value={formData.date} onChange={handleInputChange} required className="input-field pl-10" /></div>
          <div className="flex gap-2">
            <div className="relative flex-1"><Clock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><input name="time" type="time" value={formData.time} onChange={handleInputChange} required className="input-field pl-10" /></div>
            <div className="relative flex-1"><Clock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><input name="endTime" type="time" value={formData.endTime || ''} onChange={handleInputChange} className="input-field pl-10" placeholder="End" /></div>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="relative"><DollarSign className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><input name="amount" type="number" step="0.01" placeholder="Amount" value={formData.amount || ''} onChange={handleInputChange} onFocus={e => { if (e.target.value === '0') e.target.value = ''; }} className="input-field pl-10" /></div>
          <CurrencyPicker value={formData.currency} onChange={(c) => setFormData(p => ({...p, currency: c}))} />
          <select name="payment_method" value={formData.payment_method} onChange={handleInputChange} className="input-field">{PAYMENT_METHODS.map(pm => <option key={pm} value={pm}>{pm}</option>)}</select>
          <select name="rating" value={formData.rating || 0} onChange={(e) => setFormData(p => ({...p, rating: parseInt(e.target.value, 10)}))} className="input-field">
            <option value={0}>{t('eventForm.noRating')}</option>
            {[1,2,3,4,5].map(r => <option key={r} value={r}>{'⭐'.repeat(r)}</option>)}
          </select>
        </div>

        {/* Tags */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground flex items-center gap-1.5">
            <Tag className="h-4 w-4" /> {t('eventForm.tags')}
          </label>
          <div className="flex flex-wrap gap-2">
            {PRESET_TAGS.map(preset => {
              const isActive = (formData.tags || []).includes(preset.label);
              return (
                <button key={preset.label} type="button" onClick={() => toggleTag(preset.label)}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${
                    isActive ? preset.color + ' shadow-sm ring-1 ring-offset-1' : 'bg-card border-border text-muted-foreground hover:border-primary/30'
                  }`}>
                  {preset.emoji} {preset.label}
                </button>
              );
            })}
          </div>
          {(formData.tags || []).filter(tg => !PRESET_TAGS.find(p => p.label === tg)).length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {(formData.tags || []).filter(tg => !PRESET_TAGS.find(p => p.label === tg)).map(tag => (
                <span key={tag} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-secondary text-foreground border border-border">
                  🏷️ {tag}
                  <button type="button" onClick={() => toggleTag(tag)} className="hover:text-destructive"><X className="h-3 w-3" /></button>
                </span>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <input type="text" value={customTagInput} onChange={e => setCustomTagInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCustomTag(); } }}
              placeholder={t('eventForm.customTag')} className="input-field text-sm flex-1" />
            <button type="button" onClick={addCustomTag} disabled={!customTagInput.trim()} className="btn-secondary px-3 text-sm disabled:opacity-50">
              <Plus className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">{renderCategoryFields()}</div>
        <textarea name="notes" placeholder={t('eventForm.notes')} value={formData.notes || ''} onChange={handleInputChange} className="input-field" rows={2} />
        <div className="flex justify-end space-x-3">
          <button type="button" onClick={onCancel} className="btn-secondary">{t('actions.cancel')}</button>
          <button type="submit" className="btn-primary">{existingEvent ? t('eventForm.update') : t('eventForm.add')}</button>
        </div>
      </form>
    </div>
  );
};

export default AddEventForm;

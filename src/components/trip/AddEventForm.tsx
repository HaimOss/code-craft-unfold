import React, { useState } from 'react';
import { Trip, Event, EventCategory, PaymentMethod } from '@/types';
import { EVENT_CATEGORIES, CURRENCIES, PAYMENT_METHODS } from '@/constants';
import { generateId } from '@/utils/helpers';
import { Calendar, Clock, DollarSign, CreditCard, Star, FileText, MapPin, Phone, Globe, Plane, Building, Car } from 'lucide-react';

interface AddEventFormProps {
  trip: Trip;
  onAddEvent: (event: Event) => void;
  onUpdateEvent: (event: Event) => void;
  onCancel: () => void;
  existingEvent: Event | null;
  initialDate?: string;
}

const AddEventForm: React.FC<AddEventFormProps> = ({ trip, onAddEvent, onUpdateEvent, onCancel, existingEvent, initialDate }) => {
  const [formData, setFormData] = useState<Partial<Event>>({
    date: initialDate || new Date().toISOString().split('T')[0],
    time: new Date().toTimeString().substring(0, 5),
    category: EventCategory.General,
    amount: 0,
    currency: trip.base_currency,
    payment_method: PaymentMethod.Credit,
    details: {},
    rating: 0,
    ...existingEvent,
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    const processedValue = name === 'amount' ? parseFloat(value) || 0 : value;
    setFormData(prev => ({ ...prev, [name]: processedValue }));
  };

  const handleDetailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, details: { ...(prev.details || {}), [name]: value } }));
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
            <div className="relative"><Plane className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><input name="flight_num" placeholder="Flight Number" value={(formData.details as any)?.flight_num || ''} onChange={handleDetailChange} className="input-field pl-10" /></div>
            <div className="relative"><Plane className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><input name="dept_airport" placeholder="Departure Airport" value={(formData.details as any)?.dept_airport || ''} onChange={handleDetailChange} className="input-field pl-10" /></div>
            <div className="relative"><Plane className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><input name="arr_airport" placeholder="Arrival Airport" value={(formData.details as any)?.arr_airport || ''} onChange={handleDetailChange} className="input-field pl-10" /></div>
          </>
        );
      case EventCategory.Accommodation:
        return (
          <>
            <div className="relative"><Clock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><input name="check_in" type="time" placeholder="Check-in" value={(formData.details as any)?.check_in || ''} onChange={handleDetailChange} className="input-field pl-10" /></div>
            <div className="relative"><Clock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><input name="check_out" type="time" placeholder="Check-out" value={(formData.details as any)?.check_out || ''} onChange={handleDetailChange} className="input-field pl-10" /></div>
            <div className="relative"><MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><input name="address" placeholder="Address" value={(formData.details as any)?.address || ''} onChange={handleDetailChange} className="input-field pl-10" /></div>
            <div className="relative"><Globe className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><input name="book_link" placeholder="Booking Link" value={(formData.details as any)?.book_link || ''} onChange={handleDetailChange} className="input-field pl-10" /></div>
            <div className="relative"><Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><input name="phone" placeholder="Phone" value={(formData.details as any)?.phone || ''} onChange={handleDetailChange} className="input-field pl-10" /></div>
          </>
        );
      case EventCategory.Transport:
        return (
          <>
            <div className="relative"><Car className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><input name="pickup_point" placeholder="Pick-up Point" value={(formData.details as any)?.pickup_point || ''} onChange={handleDetailChange} className="input-field pl-10" /></div>
            <div className="relative"><MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><input name="dropoff_point" placeholder="Drop-off Point" value={(formData.details as any)?.dropoff_point || ''} onChange={handleDetailChange} className="input-field pl-10" /></div>
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
      <h2 className="text-2xl font-bold font-display mb-4">{existingEvent ? 'Edit Event' : 'Add New Event'}</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative"><FileText className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><input name="title" placeholder="Title" value={formData.title || ''} onChange={handleInputChange} required className="input-field pl-10" /></div>
          <select name="category" value={formData.category} onChange={handleInputChange} className="input-field">{EVENT_CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}</select>
          <div className="relative"><Calendar className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><input name="date" type="date" value={formData.date} onChange={handleInputChange} required className="input-field pl-10" /></div>
          <div className="flex gap-2">
            <div className="relative flex-1"><Clock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><input name="time" type="time" value={formData.time} onChange={handleInputChange} required className="input-field pl-10" /></div>
            <div className="relative flex-1"><Clock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><input name="endTime" type="time" value={formData.endTime || ''} onChange={handleInputChange} className="input-field pl-10" placeholder="End" /></div>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="relative"><DollarSign className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><input name="amount" type="number" step="0.01" placeholder="Amount" value={formData.amount} onChange={handleInputChange} className="input-field pl-10" /></div>
          <select name="currency" value={formData.currency} onChange={handleInputChange} className="input-field">{CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}</select>
          <select name="payment_method" value={formData.payment_method} onChange={handleInputChange} className="input-field">{PAYMENT_METHODS.map(pm => <option key={pm} value={pm}>{pm}</option>)}</select>
          <select name="rating" value={formData.rating || 0} onChange={(e) => setFormData(p => ({...p, rating: parseInt(e.target.value, 10)}))} className="input-field">
            <option value={0}>No rating</option>
            {[1,2,3,4,5].map(r => <option key={r} value={r}>{'⭐'.repeat(r)}</option>)}
          </select>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">{renderCategoryFields()}</div>
        <textarea name="notes" placeholder="Notes / Review" value={formData.notes || ''} onChange={handleInputChange} className="input-field" rows={2} />
        <div className="flex justify-end space-x-3">
          <button type="button" onClick={onCancel} className="btn-secondary">Cancel</button>
          <button type="submit" className="btn-primary">{existingEvent ? 'Update' : 'Add Event'}</button>
        </div>
      </form>
    </div>
  );
};

export default AddEventForm;

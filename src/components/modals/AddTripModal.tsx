import React, { useState } from 'react';
import { Trip, TripStatus } from '@/types';
import { CURRENCIES, TRIP_STATUSES } from '@/constants';
import { generateId } from '@/utils/helpers';
import { X } from 'lucide-react';

interface AddTripModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddTrip: (newTrip: Trip) => void;
}

const AddTripModal: React.FC<AddTripModalProps> = ({ isOpen, onClose, onAddTrip }) => {
  const today = new Date().toISOString().split('T')[0];
  const [name, setName] = useState('');
  const [destination, setDestination] = useState('');
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [baseCurrency, setBaseCurrency] = useState(CURRENCIES[0]);
  const [status, setStatus] = useState(TripStatus.Idea);
  const [coverImage, setCoverImage] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { setError('Trip name is required'); return; }
    if (new Date(startDate) > new Date(endDate)) { setError('End date must be after start date'); return; }

    const newTrip: Trip = {
      id: generateId(),
      name: name.trim(),
      destination: destination.trim(),
      start_date: startDate,
      end_date: endDate,
      base_currency: baseCurrency,
      status,
      events: [],
      cover_image: coverImage || undefined,
    };

    onAddTrip(newTrip);
    onClose();
    // Reset
    setName(''); setDestination(''); setStartDate(today); setEndDate(today);
    setBaseCurrency(CURRENCIES[0]); setStatus(TripStatus.Idea); setCoverImage(''); setError('');
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold font-display">New Trip ✈️</h2>
          <button onClick={onClose} className="btn-ghost p-1"><X className="h-5 w-5" /></button>
        </div>
        {error && <p className="text-destructive text-sm mb-4 p-2 bg-destructive/10 rounded-lg">{error}</p>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <input placeholder="Trip Name *" value={name} onChange={e => setName(e.target.value)} className="input-field" required />
          <input placeholder="Destination" value={destination} onChange={e => setDestination(e.target.value)} className="input-field" />
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-muted-foreground font-medium">Start Date</label>
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="input-field" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground font-medium">End Date</label>
              <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="input-field" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-muted-foreground font-medium">Currency</label>
              <select value={baseCurrency} onChange={e => setBaseCurrency(e.target.value)} className="input-field">
                {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground font-medium">Status</label>
              <select value={status} onChange={e => setStatus(e.target.value as TripStatus)} className="input-field">
                {TRIP_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <input placeholder="Cover Image URL (optional)" value={coverImage} onChange={e => setCoverImage(e.target.value)} className="input-field" />
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
            <button type="submit" className="btn-primary">Create Trip</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddTripModal;

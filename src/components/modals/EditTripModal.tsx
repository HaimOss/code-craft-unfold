import React, { useState, useEffect } from 'react';
import { Trip, TripStatus } from '@/types';
import { CURRENCIES, TRIP_STATUSES } from '@/constants';
import { X } from 'lucide-react';

interface EditTripModalProps {
  isOpen: boolean;
  trip: Trip;
  onClose: () => void;
  onUpdateTrip: (updatedTrip: Trip) => void;
}

const EditTripModal: React.FC<EditTripModalProps> = ({ isOpen, trip, onClose, onUpdateTrip }) => {
  const [name, setName] = useState(trip.name);
  const [destination, setDestination] = useState(trip.destination || '');
  const [startDate, setStartDate] = useState(trip.start_date);
  const [endDate, setEndDate] = useState(trip.end_date);
  const [baseCurrency, setBaseCurrency] = useState(trip.base_currency);
  const [status, setStatus] = useState(trip.status);
  const [coverImage, setCoverImage] = useState(trip.cover_image || '');
  const [albumLink, setAlbumLink] = useState(trip.album_link || '');
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setName(trip.name); setDestination(trip.destination || '');
      setStartDate(trip.start_date); setEndDate(trip.end_date);
      setBaseCurrency(trip.base_currency); setStatus(trip.status);
      setCoverImage(trip.cover_image || ''); setAlbumLink(trip.album_link || '');
      setError('');
    }
  }, [isOpen, trip]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { setError('Trip name is required'); return; }
    onUpdateTrip({
      ...trip, name: name.trim(), destination: destination.trim(),
      start_date: startDate, end_date: endDate, base_currency: baseCurrency,
      status, cover_image: coverImage || undefined, album_link: albumLink || undefined,
    });
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold font-display">Edit Trip</h2>
          <button onClick={onClose} className="btn-ghost p-1"><X className="h-5 w-5" /></button>
        </div>
        {error && <p className="text-destructive text-sm mb-4">{error}</p>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <input placeholder="Trip Name *" value={name} onChange={e => setName(e.target.value)} className="input-field" required />
          <input placeholder="Destination" value={destination} onChange={e => setDestination(e.target.value)} className="input-field" />
          <div className="grid grid-cols-2 gap-4">
            <div><label className="text-xs text-muted-foreground font-medium">Start Date</label><input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="input-field" /></div>
            <div><label className="text-xs text-muted-foreground font-medium">End Date</label><input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="input-field" /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="text-xs text-muted-foreground font-medium">Currency</label><select value={baseCurrency} onChange={e => setBaseCurrency(e.target.value)} className="input-field">{CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
            <div><label className="text-xs text-muted-foreground font-medium">Status</label><select value={status} onChange={e => setStatus(e.target.value as TripStatus)} className="input-field">{TRIP_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}</select></div>
          </div>
          <input placeholder="Cover Image URL" value={coverImage} onChange={e => setCoverImage(e.target.value)} className="input-field" />
          <input placeholder="Photo Album Link" value={albumLink} onChange={e => setAlbumLink(e.target.value)} className="input-field" />
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
            <button type="submit" className="btn-primary">Save Changes</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditTripModal;

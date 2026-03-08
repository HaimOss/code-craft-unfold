import React, { useState } from 'react';
import { Trip, TripStatus } from '@/types';
import { TRIP_STATUSES } from '@/constants';
import CurrencyPicker from '@/components/ui/CurrencyPicker';
import { generateId } from '@/utils/helpers';
import { X } from 'lucide-react';
import CoverImagePicker from './CoverImagePicker';
import TripParticipantsPicker from './TripParticipantsPicker';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTripParticipants } from '@/hooks/useTripParticipants';

interface AddTripModalProps { isOpen: boolean; onClose: () => void; onAddTrip: (newTrip: Trip) => void; }

const AddTripModal: React.FC<AddTripModalProps> = ({ isOpen, onClose, onAddTrip }) => {
  const { t } = useLanguage();
  const today = new Date().toISOString().split('T')[0];
  const [name, setName] = useState(''); const [destination, setDestination] = useState('');
  const [startDate, setStartDate] = useState(today); const [endDate, setEndDate] = useState(today);
  const [baseCurrency, setBaseCurrency] = useState('ILS'); const [status, setStatus] = useState(TripStatus.Idea);
  const [coverImage, setCoverImage] = useState(''); const [budget, setBudget] = useState(''); const [error, setError] = useState('');
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([]);
  const { saveParticipants } = useTripParticipants(undefined);
  if (!isOpen) return null;
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { setError(t('modals.tripNameRequired')); return; }
    if (new Date(startDate) > new Date(endDate)) { setError(t('modals.endDateError')); return; }
    const newTrip: Trip = { id: generateId(), name: name.trim(), destination: destination.trim(), start_date: startDate, end_date: endDate, base_currency: baseCurrency, status, events: [], cover_image: coverImage || undefined, budget: budget ? Number(budget) : undefined };
    onAddTrip(newTrip);
    // Save participants after trip is created (the real trip ID will be set by onAddTrip)
    if (selectedParticipants.length > 0) {
      // We'll save after the trip is persisted - use a small delay to ensure the trip exists
      setTimeout(() => saveParticipants(newTrip.id, selectedParticipants), 500);
    }
    onClose();
    setName(''); setDestination(''); setStartDate(today); setEndDate(today); setBaseCurrency('ILS'); setStatus(TripStatus.Idea); setCoverImage(''); setBudget(''); setError(''); setSelectedParticipants([]);
  };
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold font-display">{t('modals.newTrip')}</h2>
          <button onClick={onClose} className="btn-ghost p-1"><X className="h-5 w-5" /></button>
        </div>
        {error && <p className="text-destructive text-sm mb-4 p-2 bg-destructive/10 rounded-lg">{error}</p>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <input placeholder={t('modals.tripName')} value={name} onChange={e => setName(e.target.value)} className="input-field" required />
          <input placeholder={t('modals.destination')} value={destination} onChange={e => setDestination(e.target.value)} className="input-field" />
          <div className="grid grid-cols-2 gap-4">
            <div><label className="text-xs text-muted-foreground font-medium">{t('modals.startDate')}</label><input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="input-field" /></div>
            <div><label className="text-xs text-muted-foreground font-medium">{t('modals.endDate')}</label><input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="input-field" /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="text-xs text-muted-foreground font-medium">{t('modals.currency')}</label><CurrencyPicker value={baseCurrency} onChange={setBaseCurrency} /></div>
            <div><label className="text-xs text-muted-foreground font-medium">{t('modals.statusLabel')}</label><select value={status} onChange={e => setStatus(e.target.value as TripStatus)} className="input-field">{TRIP_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}</select></div>
          </div>
          <TripParticipantsPicker selectedIds={selectedParticipants} onChange={setSelectedParticipants} />
          <CoverImagePicker value={coverImage} onChange={setCoverImage} />
          <input type="number" placeholder={t('modals.budget')} value={budget} onChange={e => setBudget(e.target.value)} className="input-field" min="0" />
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">{t('actions.cancel')}</button>
            <button type="submit" className="btn-primary">{t('modals.createTrip')}</button>
          </div>
        </form>
      </div>
    </div>
  );
};
export default AddTripModal;

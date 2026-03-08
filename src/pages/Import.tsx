import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { getSharedItem, importSharedTrip, importSharedEvent } from '@/services/shareService';
import { fetchTrips } from '@/services/tripService';
import { toast } from '@/hooks/use-toast';
import { Trip } from '@/types';
import { Compass, Download, LogIn, AlertCircle, Loader2 } from 'lucide-react';

const Import = () => {
  const { token } = useParams<{ token: string }>();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [itemType, setItemType] = useState<string | null>(null);
  const [itemData, setItemData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [selectedTripId, setSelectedTripId] = useState<string>('');

  useEffect(() => {
    if (!token) return;
    getSharedItem(token).then(result => {
      if (!result) { setNotFound(true); setLoading(false); return; }
      setItemType(result.itemType);
      setItemData(result.itemData);
      setLoading(false);
    });
  }, [token]);

  useEffect(() => {
    if (user && itemType === 'event') {
      fetchTrips(user.id).then(setTrips).catch(() => {});
    }
  }, [user, itemType]);

  const handleImport = async () => {
    if (!user) { navigate('/auth'); return; }
    setImporting(true);
    try {
      if (itemType === 'trip') {
        await importSharedTrip(user.id, itemData);
        toast({ title: 'הטיול יובא בהצלחה! 🎉' });
      } else {
        if (!selectedTripId) { toast({ title: 'בחר טיול', variant: 'destructive' }); setImporting(false); return; }
        const trip = trips.find(t => t.id === selectedTripId);
        await importSharedEvent(user.id, selectedTripId, itemData, trip?.events.length || 0);
        toast({ title: 'הפעילות יובאה בהצלחה! 🎉' });
      }
      navigate('/');
    } catch (err: any) {
      toast({ title: 'שגיאה בייבוא', description: err.message, variant: 'destructive' });
    } finally {
      setImporting(false);
    }
  };

  if (loading || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="text-center max-w-md">
          <AlertCircle className="h-16 w-16 text-destructive mx-auto mb-4" />
          <h1 className="text-2xl font-bold font-display mb-2">קישור לא נמצא</h1>
          <p className="text-muted-foreground mb-6">הקישור לא תקין או שפג תוקפו.</p>
          <button onClick={() => navigate('/')} className="btn-primary">חזור לדף הבית</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-lg w-full bg-card rounded-2xl shadow-lg p-8 border border-border">
        <div className="flex items-center gap-3 mb-6">
          <Compass className="h-8 w-8 text-accent" />
          <h1 className="text-2xl font-bold font-display">WonderJourney</h1>
        </div>

        <div className="mb-6">
          <span className="inline-block px-3 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary mb-3">
            {itemType === 'trip' ? 'טיול משותף' : 'פעילות משותפת'}
          </span>
          <h2 className="text-xl font-bold mb-2">{itemData?.name || itemData?.title}</h2>
          {itemType === 'trip' && itemData?.destination && (
            <p className="text-muted-foreground">📍 {itemData.destination}</p>
          )}
          {itemType === 'trip' && (
            <p className="text-muted-foreground text-sm mt-1">
              {itemData?.start_date} → {itemData?.end_date} · {itemData?.events?.length || 0} פעילויות
            </p>
          )}
          {itemType === 'event' && (
            <p className="text-muted-foreground text-sm mt-1">
              {itemData?.category} · {itemData?.date} {itemData?.time}
            </p>
          )}
        </div>

        {itemType === 'event' && user && trips.length > 0 && (
          <div className="mb-6">
            <label className="block text-sm font-medium mb-2">בחר טיול לייבוא הפעילות:</label>
            <select
              value={selectedTripId}
              onChange={(e) => setSelectedTripId(e.target.value)}
              className="input-field w-full"
            >
              <option value="">בחר טיול...</option>
              {trips.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>
        )}

        {!user ? (
          <button onClick={() => navigate('/auth')} className="btn-primary w-full flex items-center justify-center gap-2">
            <LogIn className="h-4 w-4" /> התחבר כדי לייבא
          </button>
        ) : (
          <button onClick={handleImport} disabled={importing} className="btn-primary w-full flex items-center justify-center gap-2">
            {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            {importing ? 'מייבא...' : 'ייבא לחשבון שלי'}
          </button>
        )}
      </div>
    </div>
  );
};

export default Import;

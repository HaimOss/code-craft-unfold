import React, { useMemo, useState, lazy, Suspense } from 'react';
import { Trip } from '@/types';
import { CURRENCY_SYMBOLS } from '@/constants';
import { Plus, MapPin, Calendar, ArrowLeft, ArrowRight, Clock, Plane, Hotel, UtensilsCrossed, Map } from 'lucide-react';
import { differenceInDays, format, parseISO } from 'date-fns';
import { he, enUS } from 'date-fns/locale';
import { useLanguage } from '@/contexts/LanguageContext';

const WorldMap = lazy(() => import('./WorldMap'));

interface DashboardHomeProps {
  trips: Trip[];
  onSelectTrip: (tripId: string) => void;
  onAddTrip: () => void;
  displayName: string;
}

const DashboardHome: React.FC<DashboardHomeProps> = ({ trips, onSelectTrip, onAddTrip, displayName }) => {
  const { t, dir, isRTL } = useLanguage();
  const [showWorldMap, setShowWorldMap] = useState(false);
  const firstName = displayName?.split(/[\s@]/)[0] || '';

  const upcomingTrips = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return trips
      .filter(t => new Date(t.end_date + 'T23:59:59') >= today)
      .sort((a, b) => a.start_date.localeCompare(b.start_date))
      .slice(0, 4);
  }, [trips]);

  const recentActivity = useMemo(() => {
    const all = trips.flatMap(t =>
      t.events.map(e => ({ ...e, tripName: t.name, tripId: t.id }))
    );
    return all
      .sort((a, b) => b.date.localeCompare(a.date) || b.time.localeCompare(a.time))
      .slice(0, 5);
  }, [trips]);

  const totalBudget = useMemo(() => {
    return trips.reduce((sum, t) => {
      const tripTotal = t.events.reduce((s, e) => s + e.amount, 0);
      return sum + tripTotal;
    }, 0);
  }, [trips]);

  const getCategoryIcon = (category: string) => {
    if (category.includes('Flight')) return <Plane className="h-4 w-4" />;
    if (category.includes('Accommodation')) return <Hotel className="h-4 w-4" />;
    if (category.includes('Food')) return <UtensilsCrossed className="h-4 w-4" />;
    return <MapPin className="h-4 w-4" />;
  };

  const getCategoryColor = (category: string) => {
    if (category.includes('Flight')) return 'bg-sky-100 text-sky-600 dark:bg-sky-900/50 dark:text-sky-300';
    if (category.includes('Accommodation')) return 'bg-purple-100 text-purple-600 dark:bg-purple-900/50 dark:text-purple-300';
    if (category.includes('Food')) return 'bg-orange-100 text-orange-600 dark:bg-orange-900/50 dark:text-orange-300';
    if (category.includes('Transport')) return 'bg-teal-100 text-teal-600 dark:bg-teal-900/50 dark:text-teal-300';
    if (category.includes('Activity')) return 'bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-300';
    return 'bg-secondary text-muted-foreground';
  };

  const DetailArrow = isRTL ? ArrowLeft : ArrowRight;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto" dir={dir}>
      {/* Greeting */}
      <div className={`mb-8 ${isRTL ? 'text-right' : 'text-left'}`}>
        <h1 className="text-3xl sm:text-4xl font-bold font-display">
          {t('dashboard.hello')} {firstName} 👋
        </h1>
        <p className="text-muted-foreground mt-1">
          {upcomingTrips.length > 0
            ? t('dashboard.upcomingAdventures', { count: upcomingTrips.length })
            : t('dashboard.noTripsPlanned')}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
        <div className="space-y-8">
          {upcomingTrips.length > 0 && (
            <section>
              <h2 className="text-xl font-bold font-display flex items-center gap-2 mb-4">
                <Plane className="h-5 w-5 text-accent" />
                {t('dashboard.upcomingTrips')}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {upcomingTrips.map(trip => {
                  const daysUntil = differenceInDays(parseISO(trip.start_date), new Date());
                  const totalCost = trip.events.reduce((s, e) => s + e.amount, 0);
                  const symbol = CURRENCY_SYMBOLS[trip.base_currency] || trip.base_currency;

                  return (
                    <div
                      key={trip.id}
                      onClick={() => onSelectTrip(trip.id)}
                      className="group cursor-pointer bg-card rounded-2xl border border-border overflow-hidden hover:shadow-lg hover:-translate-y-1 transition-all duration-300"
                    >
                      <div className="relative h-44 overflow-hidden">
                        <img
                          src={trip.cover_image || 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=800&q=80'}
                          alt={trip.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-foreground/50 to-transparent" />
                        {daysUntil > 0 && (
                          <span className={`absolute top-3 ${isRTL ? 'right-3' : 'left-3'} bg-card/90 backdrop-blur-sm text-foreground text-xs font-bold px-3 py-1.5 rounded-full shadow-sm`}>
                            {t('dashboard.inDays', { count: daysUntil })}
                          </span>
                        )}
                        {daysUntil <= 0 && (
                          <span className={`absolute top-3 ${isRTL ? 'right-3' : 'left-3'} bg-accent text-accent-foreground text-xs font-bold px-3 py-1.5 rounded-full shadow-sm`}>
                            {t('dashboard.now')}
                          </span>
                        )}
                      </div>

                      <div className="p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h3 className="font-bold text-lg font-display text-foreground">{trip.name}</h3>
                            {trip.destination && (
                              <p className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5">
                                <MapPin className="h-3 w-3" /> {trip.destination}
                              </p>
                            )}
                          </div>
                          {totalCost > 0 && (
                            <span className="text-accent font-bold text-sm">
                              {symbol}{totalCost.toLocaleString()}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center justify-between mt-3">
                          <button className="text-primary text-sm font-medium flex items-center gap-1 hover:underline">
                            {t('dashboard.tripDetails')} <DetailArrow className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          <section>
            <h2 className="text-xl font-bold font-display mb-4">{t('dashboard.expenseAnalytics')}</h2>
            <div className="bg-card border border-border rounded-2xl p-6">
              <div className="grid grid-cols-3 gap-4 text-center mb-4">
                <div className="bg-secondary/50 rounded-xl p-3">
                  <p className="text-2xl font-bold">{trips.length}</p>
                  <p className="text-xs text-muted-foreground">{t('dashboard.tripsLabel')}</p>
                </div>
                <div className="bg-secondary/50 rounded-xl p-3">
                  <p className="text-2xl font-bold">{trips.reduce((s, tr) => s + tr.events.length, 0)}</p>
                  <p className="text-xs text-muted-foreground">{t('dashboard.activities')}</p>
                </div>
                <div className="bg-secondary/50 rounded-xl p-3">
                  <p className="text-2xl font-bold">{new Set(trips.map(tr => tr.destination).filter(Boolean)).size}</p>
                  <p className="text-xs text-muted-foreground">{t('dashboard.destinations')}</p>
                </div>
              </div>
              <div className="text-center pt-3 border-t border-border">
                <p className="text-sm text-muted-foreground">{t('dashboard.totalBudgetUsed')}</p>
                <p className="text-3xl font-bold text-foreground mt-1">₪{totalBudget.toLocaleString()}</p>
              </div>
            </div>
          </section>
        </div>

        <div className="space-y-5">
          {upcomingTrips.length > 0 && (() => {
            const next = upcomingTrips[0];
            const daysUntil = Math.max(0, differenceInDays(parseISO(next.start_date), new Date()));
            return (
              <div className="bg-primary rounded-2xl text-primary-foreground overflow-hidden relative">
                {next.cover_image && (
                  <div className="absolute inset-0 opacity-20">
                    <img src={next.cover_image} alt="" className="w-full h-full object-cover" />
                  </div>
                )}
                <div className="relative p-5">
                  <p className="text-sm opacity-80 mb-1">{t('dashboard.nextTrip')}</p>
                  <h3 className="font-bold font-display text-lg">{next.name}</h3>
                  {next.destination && (
                    <p className="text-sm opacity-70 flex items-center gap-1 mt-1">
                      <MapPin className="h-3 w-3" /> {next.destination}
                    </p>
                  )}
                  <div className="mt-4 flex items-end gap-2">
                    <span className="text-4xl font-bold">{daysUntil}</span>
                    <span className="text-sm opacity-80 pb-1">{t('dashboard.days')}</span>
                  </div>
                  <div className="mt-3 w-full h-1.5 bg-primary-foreground/20 rounded-full overflow-hidden">
                    <div className="h-full bg-primary-foreground/60 rounded-full" style={{ width: `${Math.min(100, (1 - daysUntil / 90) * 100)}%` }} />
                  </div>
                </div>
              </div>
            );
          })()}

          <div className="bg-card border border-border rounded-2xl p-5">
            <h3 className="font-bold text-sm mb-3">{t('dashboard.recentActivity')}</h3>
            {recentActivity.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">{t('dashboard.noActivityYet')}</p>
            ) : (
              <div className="space-y-3">
                {recentActivity.map((event, i) => (
                  <div
                    key={`${event.tripId}-${event.id}`}
                    className="flex items-start gap-3 cursor-pointer hover:bg-secondary/50 rounded-lg p-2 -mx-2 transition-colors"
                    onClick={() => onSelectTrip(event.tripId)}
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${getCategoryColor(event.category)}`}>
                      {getCategoryIcon(event.category)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{event.title}</p>
                      <p className="text-xs text-muted-foreground">{event.tripName}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div
            className="bg-card border border-border rounded-2xl overflow-hidden cursor-pointer group hover:shadow-lg transition-all"
            onClick={() => setShowWorldMap(true)}
          >
            <div className="h-40 bg-secondary flex items-center justify-center relative">
              <div className="absolute inset-0 opacity-30 group-hover:opacity-40 transition-opacity" style={{
                backgroundImage: `url("https://images.unsplash.com/photo-1526778548025-fa2f459cd5c1?auto=format&fit=crop&w=600&q=60")`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }} />
              <div className="relative text-center">
                <Map className="h-6 w-6 mx-auto mb-1 text-primary" />
                <p className="font-bold text-foreground text-sm">{t('dashboard.whereTo')}</p>
                <p className="text-xs text-muted-foreground mt-1">{t('dashboard.discoverNew')}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <button
        onClick={onAddTrip}
        className={`fixed bottom-6 ${isRTL ? 'right-6' : 'left-6'} z-40 bg-primary text-primary-foreground px-6 py-3.5 rounded-2xl shadow-xl hover:shadow-2xl hover:scale-105 transition-all flex items-center gap-2 font-bold text-sm`}
      >
        <Plus className="h-5 w-5" />
        {t('dashboard.planNewTrip')}
      </button>

      {showWorldMap && (
        <Suspense fallback={null}>
          <WorldMap trips={trips} onSelectTrip={onSelectTrip} onClose={() => setShowWorldMap(false)} />
        </Suspense>
      )}
    </div>
  );
};

export default DashboardHome;

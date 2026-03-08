import React, { useState, useEffect, useMemo } from 'react';
import { Trip, EventCategory } from '@/types';
import { normalizeCost } from '@/services/currencyService';
import { CATEGORY_DISPLAY_CONFIG, CURRENCY_SYMBOLS } from '@/constants';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { BarChart3, PieChart as PieChartIcon, TrendingUp, Filter } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useLanguage } from '@/contexts/LanguageContext';

interface StatsDashboardProps {
  trips: Trip[];
}

const CHART_COLORS = ['#6366f1', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#ec4899', '#6b7280'];

const StatsDashboard: React.FC<StatsDashboardProps> = ({ trips }) => {
  const { t, dir } = useLanguage();
  const [categoryData, setCategoryData] = useState<{ name: string; value: number; icon: string }[]>([]);
  const [tripComparisonData, setTripComparisonData] = useState<{ name: string; total: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [selectedTripId, setSelectedTripId] = useState<string>('all');

  const availableYears = useMemo(() => {
    const years = new Set<string>();
    trips.forEach(trip => {
      if (trip.start_date) years.add(trip.start_date.substring(0, 4));
    });
    return Array.from(years).sort().reverse();
  }, [trips]);

  const filteredTrips = useMemo(() => {
    let result = trips;
    if (selectedYear !== 'all') result = result.filter(t => t.start_date?.startsWith(selectedYear));
    if (selectedTripId !== 'all') result = result.filter(t => t.id === selectedTripId);
    return result;
  }, [trips, selectedYear, selectedTripId]);

  const tripsForFilter = useMemo(() => {
    if (selectedYear === 'all') return trips;
    return trips.filter(t => t.start_date?.startsWith(selectedYear));
  }, [trips, selectedYear]);

  useEffect(() => {
    const calculate = async () => {
      setLoading(true);
      const categoryTotals: Record<string, number> = {};
      for (const trip of filteredTrips) {
        for (const event of trip.events) {
          const cost = await normalizeCost(event.amount, event.currency, 'ILS', event.date);
          categoryTotals[event.category] = (categoryTotals[event.category] || 0) + cost;
        }
      }
      setCategoryData(
        Object.entries(categoryTotals)
          .map(([cat, value]) => ({
            name: CATEGORY_DISPLAY_CONFIG[cat]?.name || cat,
            icon: CATEGORY_DISPLAY_CONFIG[cat]?.icon || '📌',
            value: Math.round(value),
          }))
          .sort((a, b) => b.value - a.value)
      );
      const tripTotals: { name: string; total: number }[] = [];
      for (const trip of filteredTrips) {
        let total = 0;
        for (const event of trip.events) total += await normalizeCost(event.amount, event.currency, 'ILS', event.date);
        tripTotals.push({ name: trip.name.length > 15 ? trip.name.substring(0, 15) + '...' : trip.name, total: Math.round(total) });
      }
      setTripComparisonData(tripTotals);
      setLoading(false);
    };
    if (filteredTrips.length > 0) calculate();
    else { setCategoryData([]); setTripComparisonData([]); setLoading(false); }
  }, [filteredTrips]);

  const totalSpent = useMemo(() => categoryData.reduce((sum, c) => sum + c.value, 0), [categoryData]);
  const totalEvents = useMemo(() => filteredTrips.reduce((sum, t) => sum + t.events.length, 0), [filteredTrips]);

  useEffect(() => { setSelectedTripId('all'); }, [selectedYear]);

  if (loading && trips.length > 0) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (trips.length === 0) {
    return (
      <div className="text-center py-20">
        <BarChart3 className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-xl font-bold mb-2">{t('stats.noData')}</h3>
        <p className="text-muted-foreground">{t('stats.createTripsForStats')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-8" dir={dir}>
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 bg-card border border-border rounded-xl p-4">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium text-muted-foreground">{t('stats.filter')}</span>
        <Select value={selectedYear} onValueChange={setSelectedYear}>
          <SelectTrigger className="w-[140px] h-9">
            <SelectValue placeholder={t('stats.allYears')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('stats.allYears')}</SelectItem>
            {availableYears.map(year => (
              <SelectItem key={year} value={year}>{year}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={selectedTripId} onValueChange={setSelectedTripId}>
          <SelectTrigger className="w-[200px] h-9">
            <SelectValue placeholder={t('stats.allTrips')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('stats.allTrips')}</SelectItem>
            {tripsForFilter.map(trip => (
              <SelectItem key={trip.id} value={trip.id}>{trip.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-card border border-border rounded-xl p-5">
          <p className="text-sm text-muted-foreground mb-1">{t('stats.totalExpenses')}</p>
          <p className="text-2xl font-bold">₪{totalSpent.toLocaleString()}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-5">
          <p className="text-sm text-muted-foreground mb-1">{t('stats.tripsCount')}</p>
          <p className="text-2xl font-bold">{filteredTrips.length}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-5">
          <p className="text-sm text-muted-foreground mb-1">{t('stats.totalActivities')}</p>
          <p className="text-2xl font-bold">{totalEvents}</p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card border border-border rounded-xl p-6">
          <h3 className="text-lg font-bold flex items-center gap-2 mb-4">
            <PieChartIcon className="h-5 w-5 text-primary" /> {t('stats.expensesByCategory')}
          </h3>
          {categoryData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={categoryData} cx="50%" cy="50%" labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80} fill="#8884d8" dataKey="value">
                  {categoryData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => `₪${value.toLocaleString()}`} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-muted-foreground text-center py-10">{t('stats.noDataAvailable')}</p>
          )}
        </div>

        <div className="bg-card border border-border rounded-xl p-6">
          <h3 className="text-lg font-bold flex items-center gap-2 mb-4">
            <TrendingUp className="h-5 w-5 text-primary" /> {t('stats.tripComparison')}
          </h3>
          {tripComparisonData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={tripComparisonData}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="name" fontSize={12} />
                <YAxis fontSize={12} tickFormatter={(v) => `₪${v}`} />
                <Tooltip formatter={(value: number) => `₪${value.toLocaleString()}`} />
                <Bar dataKey="total" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-muted-foreground text-center py-10">{t('stats.noDataAvailable')}</p>
          )}
        </div>
      </div>

      {/* Category breakdown table */}
      <div className="bg-card border border-border rounded-xl p-6">
        <h3 className="text-lg font-bold mb-4">{t('stats.categoryBreakdown')}</h3>
        <div className="space-y-2">
          {categoryData.map((cat, i) => (
            <div key={cat.name} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
              <div className="flex items-center gap-2">
                <span>{cat.icon}</span>
                <span className="font-medium">{cat.name}</span>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{
                    width: `${totalSpent > 0 ? (cat.value / totalSpent) * 100 : 0}%`,
                    backgroundColor: CHART_COLORS[i % CHART_COLORS.length],
                  }} />
                </div>
                <span className="font-bold text-sm w-24 text-left" dir="ltr">₪{cat.value.toLocaleString()}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default StatsDashboard;

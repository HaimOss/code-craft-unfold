import { describe, it, expect } from 'vitest';
import * as XLSX from 'xlsx';
import { parseTripExcel } from '@/services/tripTemplateService';

const makeFile = (wb: XLSX.WorkBook, name = 'test.xlsx'): File => {
  const buf = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
  return new File([buf], name, { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
};

const baseTripRow = {
  name: 'Test Trip',
  destination: 'Rome',
  start_date: '2026-05-10',
  end_date: '2026-05-11',
  base_currency: 'EUR',
  status: 'Planning 📝',
  budget: 1000,
};

const buildWb = (opts: { events?: any[]; dailyInfo?: any[][] | null }) => {
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet([baseTripRow]), 'Trip');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(opts.events || []), 'Events');
  if (opts.dailyInfo) {
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(opts.dailyInfo), 'DailyInfo');
  }
  return wb;
};

describe('parseTripExcel — DailyInfo', () => {
  it('reads DailyInfo sheet when present', async () => {
    const wb = buildWb({
      events: [],
      dailyInfo: [
        ['date', 'start_point', 'end_point'],
        ['2026-05-10', 'Hotel A, Rome', 'Hotel A, Rome'],
        ['2026-05-11', 'Hotel A, Rome', 'FCO Airport'],
      ],
    });
    const res = await parseTripExcel(makeFile(wb));
    expect(res.errors).toEqual([]);
    expect(res.trip.dailyInfo?.['2026-05-10']).toEqual({ startPoint: 'Hotel A, Rome', endPoint: 'Hotel A, Rome' });
    expect(res.trip.dailyInfo?.['2026-05-11']?.endPoint).toBe('FCO Airport');
  });

  it('infers daily points from tagged events when DailyInfo is missing', async () => {
    const events = [
      {
        date: '2026-05-10', time: '08:00', category: 'Accommodation 🏨',
        title: 'Hotel breakfast', amount: 0, currency: 'EUR', payment_method: 'Credit',
        address: 'Hotel Foro, Rome', tags: 'תחילת-יום',
      },
      {
        date: '2026-05-10', time: '22:00', category: 'Accommodation 🏨',
        title: 'Sleep', amount: 0, currency: 'EUR', payment_method: 'Credit',
        address: 'Hotel Foro, Rome', tags: 'סוף-יום',
      },
    ];
    const wb = buildWb({ events, dailyInfo: null });
    const res = await parseTripExcel(makeFile(wb));
    expect(res.trip.dailyInfo?.['2026-05-10']?.startPoint).toBe('Hotel Foro, Rome');
    expect(res.trip.dailyInfo?.['2026-05-10']?.endPoint).toBe('Hotel Foro, Rome');
  });

  it('warns for days missing daily points', async () => {
    const wb = buildWb({ events: [], dailyInfo: null });
    const res = await parseTripExcel(makeFile(wb));
    expect(res.warnings.some(w => w.includes('חסרה נקודת התחלה'))).toBe(true);
    expect(res.warnings.some(w => w.includes('חסרה נקודת סיום'))).toBe(true);
  });
});
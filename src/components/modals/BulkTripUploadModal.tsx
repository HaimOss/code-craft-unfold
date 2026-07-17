import React, { useState, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download, Upload, FileSpreadsheet, CheckCircle2, AlertTriangle, Loader2, ShieldAlert } from 'lucide-react';
import { downloadTripTemplate, parseTripExcel, ParsedTripResult } from '@/services/tripTemplateService';
import { createTrip, upsertEvent, deleteAllTripEvents, updateTrip } from '@/services/tripService';
import { exportTripToJSON } from '@/services/shareService';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { toast } from '@/hooks/use-toast';
import { Trip } from '@/types';

interface BulkTripUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTripCreated?: (trip: Trip) => void;
  /** If provided, the modal replaces this trip's content instead of creating a new one. */
  targetTrip?: Trip;
  /** Called after a successful replace with the fully updated trip. */
  onTripReplaced?: (trip: Trip) => void;
}

const BulkTripUploadModal: React.FC<BulkTripUploadModalProps> = ({ isOpen, onClose, onTripCreated, targetTrip, onTripReplaced }) => {
  const { user } = useAuth();
  const { dir } = useLanguage();
  const isReplaceMode = !!targetTrip;
  const [parsed, setParsed] = useState<ParsedTripResult | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [dragging, setDragging] = useState(false);
  const [importing, setImporting] = useState(false);
  const [backupDone, setBackupDone] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

  const reset = () => { setParsed(null); setFileName(''); setImporting(false); setConfirmReset(false); };

  const handleClose = () => { reset(); onClose(); };

  const handleBackup = () => {
    if (!targetTrip) return;
    exportTripToJSON(targetTrip);
    setBackupDone(true);
    toast({ title: 'גיבוי JSON הורד', description: 'שמור את הקובץ במקום בטוח לפני האיפוס.' });
  };

  const handleFile = useCallback(async (file: File) => {
    setFileName(file.name);
    try {
      const result = await parseTripExcel(file);
      setParsed(result);
    } catch (err: any) {
      toast({ title: 'שגיאה בקריאת הקובץ', description: err.message, variant: 'destructive' });
      setParsed(null);
      setFileName('');
    }
  }, []);

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (f) handleFile(f);
  };

  const pickFile = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.xlsx,.xls';
    input.onchange = (e) => {
      const f = (e.target as HTMLInputElement).files?.[0];
      if (f) handleFile(f);
    };
    input.click();
  };

  const handleImport = async () => {
    if (!user || !parsed || parsed.errors.length > 0) return;
    if (isReplaceMode && !confirmReset) return;
    setImporting(true);
    try {
      if (isReplaceMode && targetTrip) {
        // 1. Wipe existing events
        await deleteAllTripEvents(targetTrip.id);
        // 2. Update trip metadata from Excel (keep same id + user)
        const merged: Trip = { ...targetTrip, ...(parsed.trip as any), id: targetTrip.id, events: parsed.events };
        await updateTrip(merged);
        // 3. Insert new events
        for (let i = 0; i < parsed.events.length; i++) {
          await upsertEvent(user.id, targetTrip.id, parsed.events[i], i);
        }
        toast({ title: 'הטיול עודכן! 🔄', description: `${parsed.events.length} אירועים חדשים נטענו` });
        onTripReplaced?.(merged);
      } else {
        const tripId = await createTrip(user.id, { ...(parsed.trip as any) });
        for (let i = 0; i < parsed.events.length; i++) {
          await upsertEvent(user.id, tripId, parsed.events[i], i);
        }
        toast({ title: 'הטיול נוצר בהצלחה! 🎉', description: `${parsed.events.length} אירועים נטענו` });
        onTripCreated?.({ ...(parsed.trip as any), id: tripId, events: parsed.events });
      }
      handleClose();
    } catch (err: any) {
      toast({ title: isReplaceMode ? 'שגיאה בעדכון הטיול' : 'שגיאה ביצירת הטיול', description: err.message, variant: 'destructive' });
    } finally {
      setImporting(false);
    }
  };

  const eventsByDate = parsed ? parsed.events.reduce<Record<string, number>>((acc, e) => {
    acc[e.date] = (acc[e.date] || 0) + 1;
    return acc;
  }, {}) : {};

  const dailySummary = React.useMemo(() => {
    if (!parsed) return null;
    const s = parsed.trip.start_date;
    const e = parsed.trip.end_date;
    if (!s || !e) return null;
    const dates: string[] = [];
    const start = new Date(s + 'T00:00:00');
    const end = new Date(e + 'T00:00:00');
    for (let dt = new Date(start); dt <= end; dt.setDate(dt.getDate() + 1)) {
      dates.push(dt.toISOString().slice(0, 10));
    }
    const di = (parsed.trip as any).dailyInfo || {};
    let withStart = 0, withEnd = 0, complete = 0;
    for (const d of dates) {
      const info = di[d] || {};
      if (info.startPoint) withStart++;
      if (info.endPoint) withEnd++;
      if (info.startPoint && info.endPoint) complete++;
    }
    return { total: dates.length, withStart, withEnd, complete };
  }, [parsed]);

  return (
    <Dialog open={isOpen} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col" dir={dir}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-primary" />
            {isReplaceMode ? `החלפת תוכן הטיול "${targetTrip?.name}" מ-Excel` : 'טעינת טיול מלא מ-Excel'}
          </DialogTitle>
          <DialogDescription>
            {isReplaceMode
              ? 'פעולה זו תמחק את כל האירועים הקיימים בטיול ותחליף אותם בתוכן שבקובץ ה-Excel. מומלץ בחום להוריד גיבוי JSON קודם.'
              : 'הורד תבנית, מלא אותה ב-Excel, והעלה חזרה כדי ליצור טיול שלם עם כל האירועים בבת אחת.'}
          </DialogDescription>
        </DialogHeader>

        <div className="overflow-y-auto flex-1 space-y-5 pr-1">
          {isReplaceMode && targetTrip && (
            <section className="rounded-xl border-2 border-destructive/40 bg-destructive/5 p-4">
              <div className="flex items-start gap-3">
                <ShieldAlert className="h-6 w-6 text-destructive shrink-0 mt-0.5" />
                <div className="flex-1 space-y-3">
                  <div>
                    <h3 className="font-bold text-destructive mb-1">אזהרה — פעולה בלתי הפיכה</h3>
                    <p className="text-sm text-foreground">
                      טעינת קובץ Excel <b>תמחק לצמיתות</b> את <b>{targetTrip.events.length}</b> האירועים הקיימים בטיול זה,
                      ותחליף אותם באירועים שבקובץ. פרטי הטיול (שם, יעד, תאריכים וכו') יעודכנו גם הם לפי הקובץ.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      onClick={handleBackup}
                      variant="outline"
                      size="sm"
                      className="gap-2"
                    >
                      <Download className="h-4 w-4" />
                      {backupDone ? 'הורד גיבוי שוב' : 'הורד גיבוי JSON קודם (מומלץ)'}
                    </Button>
                    {backupDone && (
                      <span className="text-xs text-green-700 dark:text-green-400 flex items-center gap-1">
                        <CheckCircle2 className="h-3.5 w-3.5" /> גיבוי הורד
                      </span>
                    )}
                  </div>
                  <label className="flex items-start gap-2 text-sm cursor-pointer select-none pt-1">
                    <input
                      type="checkbox"
                      checked={confirmReset}
                      onChange={(e) => setConfirmReset(e.target.checked)}
                      className="mt-1"
                    />
                    <span>
                      אני מבין/ה ש-<b>{targetTrip.events.length} האירועים</b> הקיימים יימחקו ולא ניתן יהיה לשחזרם ללא הגיבוי.
                    </span>
                  </label>
                </div>
              </div>
            </section>
          )}

          {/* Step 1 */}
          <section className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold shrink-0">1</div>
              <div className="flex-1">
                <h3 className="font-semibold mb-1">הורדת תבנית</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  קובץ Excel עם 3 גיליונות: <b>Trip</b> (פרטי הטיול), <b>Events</b> (אירועים), <b>Instructions</b> (הסבר וערכים מותרים).
                </p>
                <Button onClick={downloadTripTemplate} variant="outline" size="sm" className="gap-2">
                  <Download className="h-4 w-4" />
                  הורד תבנית Excel
                </Button>
              </div>
            </div>
          </section>

          {/* Step 2 */}
          <section className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold shrink-0">2</div>
              <div className="flex-1">
                <h3 className="font-semibold mb-1">מילוי הקובץ</h3>
                <ul className="text-sm text-muted-foreground space-y-1 list-disc ps-5">
                  <li>תאריכים בפורמט <code className="bg-muted px-1 rounded">YYYY-MM-DD</code></li>
                  <li>שעות בפורמט 24 שעות <code className="bg-muted px-1 rounded">HH:MM</code></li>
                  <li>קטגוריות ומטבעות — ראו גיליון Instructions</li>
                  <li>שורה ריקה מדלגת אוטומטית</li>
                </ul>
              </div>
            </div>
          </section>

          {/* Step 3 */}
          <section className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold shrink-0">3</div>
              <div className="flex-1">
                <h3 className="font-semibold mb-2">העלאה</h3>
                {!parsed ? (
                  <div
                    onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                    onDragLeave={() => setDragging(false)}
                    onDrop={onDrop}
                    onClick={pickFile}
                    className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${dragging ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}`}
                  >
                    <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm font-medium">גרור לכאן קובץ Excel או לחץ לבחירה</p>
                    <p className="text-xs text-muted-foreground mt-1">.xlsx / .xls</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm">
                      <FileSpreadsheet className="h-4 w-4 text-primary" />
                      <span className="font-medium">{fileName}</span>
                      <button onClick={reset} className="text-xs text-muted-foreground hover:text-foreground underline ms-auto">החלף קובץ</button>
                    </div>

                    {/* Preview */}
                    <div className="rounded-lg bg-muted/50 p-3 space-y-2">
                      <div className="flex items-center gap-2 text-sm font-semibold">
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                        תצוגה מקדימה
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div><span className="text-muted-foreground">שם:</span> <b>{parsed.trip.name || '—'}</b></div>
                        <div><span className="text-muted-foreground">יעד:</span> <b>{parsed.trip.destination || '—'}</b></div>
                        <div><span className="text-muted-foreground">תאריכים:</span> <b>{parsed.trip.start_date} → {parsed.trip.end_date}</b></div>
                        <div><span className="text-muted-foreground">מטבע:</span> <b>{parsed.trip.base_currency}</b></div>
                        <div><span className="text-muted-foreground">סטטוס:</span> <b>{parsed.trip.status}</b></div>
                        <div><span className="text-muted-foreground">אירועים:</span> <b>{parsed.events.length}</b></div>
                      </div>
                      {Object.keys(eventsByDate).length > 0 && (
                        <div className="text-xs pt-2 border-t border-border/60">
                          <div className="text-muted-foreground mb-1">אירועים לפי יום:</div>
                          <div className="flex flex-wrap gap-1">
                            {Object.entries(eventsByDate).sort().map(([d, n]) => (
                              <span key={d} className="bg-background border border-border rounded px-2 py-0.5">{d}: {n}</span>
                            ))}
                          </div>
                        </div>
                      )}
                      {dailySummary && (
                        <div className={`text-xs pt-2 border-t border-border/60 ${dailySummary.complete < dailySummary.total ? 'text-yellow-800 dark:text-yellow-200' : 'text-green-700 dark:text-green-400'}`}>
                          <div className="font-medium mb-0.5">🗺️ נקודות מסלול יומיות: {dailySummary.complete}/{dailySummary.total} ימים מלאים</div>
                          <div className="text-muted-foreground">התחלה: {dailySummary.withStart}/{dailySummary.total} · סיום: {dailySummary.withEnd}/{dailySummary.total}</div>
                        </div>
                      )}
                    </div>

                    {parsed.errors.length > 0 && (
                      <div className="rounded-lg bg-destructive/10 border border-destructive/30 p-3">
                        <div className="flex items-center gap-2 text-sm font-semibold text-destructive mb-1">
                          <AlertTriangle className="h-4 w-4" /> שגיאות — יש לתקן לפני הייבוא
                        </div>
                        <ul className="text-xs text-destructive space-y-0.5 list-disc ps-5">
                          {parsed.errors.map((e, i) => <li key={i}>{e}</li>)}
                        </ul>
                      </div>
                    )}

                    {parsed.warnings.length > 0 && (
                      <div className="rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-300 dark:border-yellow-800 p-3">
                        <div className="flex items-center gap-2 text-sm font-semibold text-yellow-800 dark:text-yellow-200 mb-1">
                          <AlertTriangle className="h-4 w-4" /> אזהרות ({parsed.warnings.length})
                        </div>
                        <ul className="text-xs text-yellow-800 dark:text-yellow-200 space-y-0.5 list-disc ps-5 max-h-32 overflow-y-auto">
                          {parsed.warnings.map((w, i) => <li key={i}>{w}</li>)}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </section>
        </div>

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
          <Button variant="ghost" onClick={handleClose} disabled={importing}>ביטול</Button>
          <Button
            onClick={handleImport}
            disabled={!parsed || parsed.errors.length > 0 || importing || (isReplaceMode && !confirmReset)}
            className="gap-2"
            variant={isReplaceMode ? 'destructive' : 'default'}
          >
            {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            {importing
              ? (isReplaceMode ? 'מחליף תוכן...' : 'יוצר טיול...')
              : isReplaceMode
                ? `מחק והחלף (${parsed?.events.length ?? 0} אירועים)`
                : `צור טיול${parsed ? ` (${parsed.events.length} אירועים)` : ''}`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BulkTripUploadModal;

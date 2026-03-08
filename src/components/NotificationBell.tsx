import React, { useState, useEffect } from 'react';
import { Bell, Check, Trash2, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { formatDistanceToNow } from 'date-fns';
import { he, enUS } from 'date-fns/locale';
import { useLanguage } from '@/contexts/LanguageContext';

interface AppNotification { id: string; type: string; title: string; message: string; is_read: boolean; trip_id: string | null; link: string | null; created_at: string; user_id: string; }
interface NotificationBellProps { onSelectTrip?: (tripId: string) => void; }

const NotificationBell: React.FC<NotificationBellProps> = ({ onSelectTrip }) => {
  const { user } = useAuth();
  const { t, dir, language } = useLanguage();
  const [notifications, setNotifications] = useState<AppNotification[]>([]); const [isOpen, setIsOpen] = useState(false); const [loading, setLoading] = useState(false);
  const dateLocale = language === 'he' ? he : enUS;

  const fetchNotifications = async () => { if (!user) return; setLoading(true); const { data } = await supabase.from('notifications').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(20); setNotifications((data as AppNotification[]) || []); setLoading(false); };
  useEffect(() => { fetchNotifications(); }, [user]);
  useEffect(() => { if (!user) return; const channel = supabase.channel('notifications-bell').on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, (payload) => { const n = payload.new as AppNotification; if (n.user_id === user.id) setNotifications(prev => [n, ...prev]); }).subscribe(); return () => { supabase.removeChannel(channel); }; }, [user]);

  const unreadCount = notifications.filter(n => !n.is_read).length;
  const markAsRead = async (id: string) => { await supabase.from('notifications').update({ is_read: true } as any).eq('id', id); setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n)); };
  const markAllAsRead = async () => { if (!user) return; const ids = notifications.filter(n => !n.is_read).map(n => n.id); if (!ids.length) return; await supabase.from('notifications').update({ is_read: true } as any).in('id', ids); setNotifications(prev => prev.map(n => ({ ...n, is_read: true }))); };
  const deleteNotification = async (id: string) => { await supabase.from('notifications').delete().eq('id', id); setNotifications(prev => prev.filter(n => n.id !== id)); };
  const handleClick = (n: AppNotification) => { markAsRead(n.id); if (n.trip_id && onSelectTrip) { onSelectTrip(n.trip_id); setIsOpen(false); } };
  const getIcon = (type: string) => { switch (type) { case 'trip_reminder': return '✈️'; case 'checklist_reminder': return '✅'; case 'trip_tomorrow': return '🔔'; case 'trip_week': return '📅'; default: return '🔔'; } };

  return (
    <div className="relative">
      <button onClick={() => setIsOpen(!isOpen)} className="relative p-2 rounded-full hover:bg-secondary transition-colors" aria-label={t('notifications.title')}>
        <Bell className="h-5 w-5 text-muted-foreground" />
        {unreadCount > 0 && <span className="absolute -top-0.5 -right-0.5 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full h-4 w-4 flex items-center justify-center min-w-[16px]">{unreadCount > 9 ? '9+' : unreadCount}</span>}
      </button>
      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute left-0 sm:right-0 sm:left-auto top-full mt-2 w-[calc(100vw-2rem)] sm:w-96 max-h-[70vh] bg-card border border-border rounded-xl shadow-2xl z-50 overflow-hidden" dir={dir}>
            <div className="flex items-center justify-between p-3 border-b border-border">
              <h3 className="font-bold text-sm">{t('notifications.title')}</h3>
              <div className="flex items-center gap-1">
                {unreadCount > 0 && <button onClick={markAllAsRead} className="text-xs text-primary hover:underline px-2 py-1">{t('notifications.markAllRead')}</button>}
                <button onClick={() => setIsOpen(false)} className="p-1 rounded hover:bg-secondary"><X className="h-4 w-4 text-muted-foreground" /></button>
              </div>
            </div>
            <div className="overflow-y-auto max-h-[calc(70vh-48px)]">
              {loading ? <div className="p-8 text-center"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" /></div>
              : notifications.length === 0 ? <div className="p-8 text-center text-muted-foreground"><Bell className="h-8 w-8 mx-auto mb-2 opacity-30" /><p className="text-sm">{t('notifications.noNew')}</p></div>
              : notifications.map(n => (
                <div key={n.id} className={`flex items-start gap-3 p-3 border-b border-border/50 hover:bg-secondary/50 transition-colors cursor-pointer ${!n.is_read ? 'bg-primary/5' : ''}`} onClick={() => handleClick(n)}>
                  <span className="text-lg mt-0.5 flex-shrink-0">{getIcon(n.type)}</span>
                  <div className="flex-grow min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className={`text-sm leading-tight ${!n.is_read ? 'font-semibold' : ''}`}>{n.title}</p>
                      {!n.is_read && <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-1.5" />}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.message}</p>
                    <p className="text-[10px] text-muted-foreground/60 mt-1">{formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: dateLocale })}</p>
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); deleteNotification(n.id); }} className="p-1 rounded hover:bg-secondary text-muted-foreground/50 hover:text-destructive flex-shrink-0"><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
export default NotificationBell;

import React, { useState, useEffect } from 'react';
import { Bell, Check, CheckCheck, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { formatDistanceToNow } from 'date-fns';
import { he, enUS } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';

interface AppNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  is_read: boolean;
  trip_id: string | null;
  link: string | null;
  created_at: string;
  user_id: string;
}

interface NotificationsViewProps {
  onSelectTrip?: (tripId: string) => void;
}

const getIcon = (type: string) => {
  switch (type) {
    case 'trip_reminder': return '✈️';
    case 'checklist_reminder': return '✅';
    case 'trip_tomorrow': return '🔔';
    case 'trip_week': return '📅';
    default: return '🔔';
  }
};

const NotificationsView: React.FC<NotificationsViewProps> = ({ onSelectTrip }) => {
  const { user } = useAuth();
  const { t, dir, language } = useLanguage();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const dateLocale = language === 'he' ? he : enUS;

  const fetchNotifications = async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    setNotifications((data as AppNotification[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchNotifications();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel('notifications-page')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, (payload) => {
        const n = payload.new as AppNotification;
        if (n.user_id === user.id) setNotifications(prev => [n, ...prev]);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const markAsRead = async (id: string) => {
    await supabase.from('notifications').update({ is_read: true } as any).eq('id', id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
  };

  const markAllAsRead = async () => {
    if (!user) return;
    const ids = notifications.filter(n => !n.is_read).map(n => n.id);
    if (!ids.length) return;
    await supabase.from('notifications').update({ is_read: true } as any).in('id', ids);
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    toast({ title: t('notifications.allMarkedRead') });
  };

  const deleteNotification = async (id: string) => {
    await supabase.from('notifications').delete().eq('id', id);
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const deleteAllRead = async () => {
    if (!user) return;
    const ids = notifications.filter(n => n.is_read).map(n => n.id);
    if (!ids.length) return;
    await supabase.from('notifications').delete().in('id', ids);
    setNotifications(prev => prev.filter(n => !n.is_read));
    toast({ title: t('notifications.readDeleted') });
  };

  const handleClick = (n: AppNotification) => {
    markAsRead(n.id);
    if (n.trip_id && onSelectTrip) {
      onSelectTrip(n.trip_id);
    }
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-3xl mx-auto" dir={dir}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold font-display">{t('notifications.title')}</h1>
          {unreadCount > 0 && (
            <p className="text-sm text-muted-foreground mt-1">
              {language === 'he' ? `${unreadCount} התראות שלא נקראו` : `${unreadCount} unread`}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <Button variant="outline" size="sm" onClick={markAllAsRead} className="flex items-center gap-1.5">
              <CheckCheck className="h-4 w-4" />
              <span className="hidden sm:inline">{t('notifications.markAllRead')}</span>
            </Button>
          )}
          {notifications.some(n => n.is_read) && (
            <Button variant="ghost" size="sm" onClick={deleteAllRead} className="flex items-center gap-1.5 text-muted-foreground hover:text-destructive">
              <Trash2 className="h-4 w-4" />
              <span className="hidden sm:inline">{t('notifications.deleteRead')}</span>
            </Button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : notifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Bell className="h-16 w-16 text-muted-foreground/20 mb-4" />
          <p className="text-lg font-medium text-muted-foreground">{t('notifications.noNew')}</p>
          <p className="text-sm text-muted-foreground/60 mt-1">{t('notifications.emptyDesc')}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map(n => (
            <div
              key={n.id}
              className={`flex items-start gap-4 p-4 rounded-xl border transition-colors cursor-pointer
                ${!n.is_read
                  ? 'bg-primary/5 border-primary/20 hover:bg-primary/10'
                  : 'bg-card border-border hover:bg-secondary/50'
                }`}
              onClick={() => handleClick(n)}
            >
              <span className="text-2xl flex-shrink-0 mt-0.5">{getIcon(n.type)}</span>
              <div className="flex-grow min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <p className={`text-sm leading-tight ${!n.is_read ? 'font-semibold' : ''}`}>{n.title}</p>
                  {!n.is_read && <div className="w-2.5 h-2.5 rounded-full bg-primary flex-shrink-0 mt-1" />}
                </div>
                <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{n.message}</p>
                <p className="text-xs text-muted-foreground/60 mt-2">
                  {formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: dateLocale })}
                </p>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                {!n.is_read && (
                  <button
                    onClick={(e) => { e.stopPropagation(); markAsRead(n.id); }}
                    className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground/50 hover:text-primary transition-colors"
                    title={t('notifications.markRead')}
                  >
                    <Check className="h-4 w-4" />
                  </button>
                )}
                <button
                  onClick={(e) => { e.stopPropagation(); deleteNotification(n.id); }}
                  className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground/50 hover:text-destructive transition-colors"
                  title={t('actions.delete')}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default NotificationsView;

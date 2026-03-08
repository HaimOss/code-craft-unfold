import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from 'next-themes';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { User, Globe, Coins, Moon, Sun, Bell, Trash2, Save, Camera } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Switch } from '@/components/ui/switch';
import CurrencyPicker from '@/components/ui/CurrencyPicker';
import { CURRENCIES } from '@/constants';
import FamilyMembersManager from './FamilyMembersManager';

const SettingsView: React.FC = () => {
  const { user, signOut } = useAuth();
  const { t, language, setLanguage, isRTL, dir } = useLanguage();
  const { theme, setTheme } = useTheme();

  const [displayName, setDisplayName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [defaultCurrency, setDefaultCurrency] = useState('ILS');
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('display_name, avatar_url')
        .eq('id', user.id)
        .single();
      if (data) {
        setDisplayName(data.display_name || '');
        setAvatarUrl(data.avatar_url || '');
      }
    };
    load();
  }, [user]);

  const handleSaveProfile = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ display_name: displayName, updated_at: new Date().toISOString() })
        .eq('id', user.id);
      if (error) throw error;
      toast({ title: t('settings.saved') });
    } catch (err: any) {
      toast({ title: t('settings.saveError'), description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    try {
      const ext = file.name.split('.').pop();
      const path = `${user.id}/avatar.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from('cover-images')
        .upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from('cover-images').getPublicUrl(path);
      const newUrl = urlData.publicUrl + '?t=' + Date.now();
      await supabase.from('profiles').update({ avatar_url: newUrl }).eq('id', user.id);
      setAvatarUrl(newUrl);
      toast({ title: t('settings.avatarUpdated') });
    } catch (err: any) {
      toast({ title: t('settings.saveError'), description: err.message, variant: 'destructive' });
    }
  };

  const handleDeleteAccount = async () => {
    // For now, just sign out. Full deletion requires backend function.
    toast({ title: t('settings.deleteNotice'), variant: 'destructive' });
    setDeleteConfirm(false);
  };

  const initials = (displayName || user?.email || '')
    .split(/[\s@]/)
    .filter(Boolean)
    .slice(0, 2)
    .map(s => s[0]?.toUpperCase())
    .join('');

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-2xl mx-auto" dir={dir}>
      <h1 className="text-2xl sm:text-3xl font-bold font-display mb-8">{t('settings.title')}</h1>

      <div className="space-y-6">
        {/* Profile Section */}
        <section className="rounded-xl border border-border bg-card p-5 space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            {t('settings.profile')}
          </h2>
          <div className="flex items-center gap-4">
            <div className="relative group">
              <Avatar className="h-16 w-16">
                <AvatarImage src={avatarUrl} alt={displayName} />
                <AvatarFallback className="bg-primary text-primary-foreground text-lg font-bold">
                  {initials || <User className="h-6 w-6" />}
                </AvatarFallback>
              </Avatar>
              <label className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                <Camera className="h-5 w-5 text-white" />
                <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
              </label>
            </div>
            <div className="flex-1 space-y-2">
              <label className="text-sm font-medium text-muted-foreground">{t('settings.displayName')}</label>
              <input
                type="text"
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                className="input-field w-full"
                dir="auto"
              />
            </div>
          </div>
          <div className="text-sm text-muted-foreground">
            {user?.email}
          </div>
          <button
            onClick={handleSaveProfile}
            disabled={saving}
            className="btn-primary px-4 py-2 text-sm flex items-center gap-2"
          >
            <Save className="h-4 w-4" />
            {saving ? t('settings.saving') : t('settings.saveProfile')}
          </button>
        </section>

        {/* Language Section */}
        <section className="rounded-xl border border-border bg-card p-5 space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Globe className="h-5 w-5 text-primary" />
            {t('settings.defaultLanguage')}
          </h2>
          <div className="flex gap-2">
            <button
              onClick={() => setLanguage('he')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                language === 'he'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-foreground hover:bg-secondary/80'
              }`}
            >
              עברית
            </button>
            <button
              onClick={() => setLanguage('en')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                language === 'en'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-foreground hover:bg-secondary/80'
              }`}
            >
              English
            </button>
          </div>
        </section>

        {/* Family Members Section */}
        <FamilyMembersManager />

        {/* Currency Section */}
        <section className="rounded-xl border border-border bg-card p-5 space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Coins className="h-5 w-5 text-primary" />
            {t('settings.defaultCurrency')}
          </h2>
          <p className="text-sm text-muted-foreground">{t('settings.defaultCurrencyDesc')}</p>
          <div className="max-w-[200px]">
            <CurrencyPicker value={defaultCurrency} onChange={setDefaultCurrency} />
          </div>
        </section>

        {/* Theme Section */}
        <section className="rounded-xl border border-border bg-card p-5 space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            {theme === 'dark' ? <Moon className="h-5 w-5 text-primary" /> : <Sun className="h-5 w-5 text-primary" />}
            {t('settings.appearance')}
          </h2>
          <div className="flex items-center justify-between">
            <span className="text-sm">{t('settings.darkMode')}</span>
            <Switch
              checked={theme === 'dark'}
              onCheckedChange={checked => setTheme(checked ? 'dark' : 'light')}
            />
          </div>
        </section>

        {/* Notifications Section */}
        <section className="rounded-xl border border-border bg-card p-5 space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" />
            {t('settings.notifications')}
          </h2>
          <div className="flex items-center justify-between">
            <span className="text-sm">{t('settings.enableNotifications')}</span>
            <Switch
              checked={notificationsEnabled}
              onCheckedChange={setNotificationsEnabled}
            />
          </div>
        </section>

        {/* Delete Account Section */}
        <section className="rounded-xl border border-destructive/30 bg-card p-5 space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2 text-destructive">
            <Trash2 className="h-5 w-5" />
            {t('settings.deleteAccount')}
          </h2>
          <p className="text-sm text-muted-foreground">{t('settings.deleteWarning')}</p>
          {!deleteConfirm ? (
            <button
              onClick={() => setDeleteConfirm(true)}
              className="px-4 py-2 text-sm rounded-lg border border-destructive text-destructive hover:bg-destructive/10 transition-colors"
            >
              {t('settings.deleteAccount')}
            </button>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={handleDeleteAccount}
                className="px-4 py-2 text-sm rounded-lg bg-destructive text-destructive-foreground"
              >
                {t('settings.confirmDelete')}
              </button>
              <button
                onClick={() => setDeleteConfirm(false)}
                className="px-4 py-2 text-sm rounded-lg bg-secondary text-foreground"
              >
                {t('settings.cancel')}
              </button>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default SettingsView;

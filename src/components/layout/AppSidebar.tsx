import React from 'react';
import { LayoutDashboard, Plane, BarChart3, Bell, Settings, Compass, Bookmark } from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarHeader,
  useSidebar,
} from '@/components/ui/sidebar';
import { useLanguage } from '@/contexts/LanguageContext';

export type AppView = 'dashboard' | 'trips' | 'activityBank' | 'stats' | 'notifications' | 'settings';

interface AppSidebarProps {
  activeView: AppView;
  onViewChange: (view: AppView) => void;
  notificationCount?: number;
}

const NAV_KEYS: { view: AppView; labelKey: string; icon: React.ElementType }[] = [
  { view: 'dashboard', labelKey: 'nav.dashboard', icon: LayoutDashboard },
  { view: 'trips', labelKey: 'nav.trips', icon: Plane },
  { view: 'stats', labelKey: 'nav.stats', icon: BarChart3 },
  { view: 'notifications', labelKey: 'nav.notifications', icon: Bell },
  { view: 'settings', labelKey: 'nav.settings', icon: Settings },
];

const AppSidebar: React.FC<AppSidebarProps> = ({ activeView, onViewChange, notificationCount = 0 }) => {
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const { t, dir, isRTL } = useLanguage();

  return (
    <Sidebar collapsible="icon" side={isRTL ? 'right' : 'left'} className={isRTL ? 'border-l border-border' : 'border-r border-border'} dir={dir}>
      <SidebarHeader className="p-4">
        <div className={`flex items-center gap-2 ${isRTL ? 'justify-end' : 'justify-start'}`} dir={dir}>
          <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center shrink-0">
            <Compass className="h-5 w-5 text-primary-foreground" />
          </div>
          {!collapsed && (
            <div className={isRTL ? 'text-right' : 'text-left'}>
              <h2 className="text-lg font-bold font-display text-foreground leading-tight">{t('app.name')}</h2>
              <p className="text-[10px] text-muted-foreground">{t('app.tagline')}</p>
            </div>
          )}
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {NAV_KEYS.map(({ view, labelKey, icon: Icon }) => {
                const isActive = activeView === view;
                const label = t(labelKey);
                return (
                  <SidebarMenuItem key={view}>
                    <SidebarMenuButton
                      onClick={() => onViewChange(view)}
                      isActive={isActive}
                      tooltip={label}
                      className={`flex ${isRTL ? 'flex-row-reverse' : 'flex-row'} items-center gap-3 justify-start px-3 py-2.5 rounded-xl transition-all ${
                        isActive
                          ? 'bg-primary text-primary-foreground font-semibold shadow-md'
                          : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                      }`}
                    >
                      <div className="relative">
                        <Icon className="h-5 w-5" />
                        {view === 'notifications' && notificationCount > 0 && (
                          <span className="absolute -top-1.5 -start-1.5 bg-destructive text-destructive-foreground text-[9px] font-bold rounded-full h-4 w-4 flex items-center justify-center">
                            {notificationCount > 9 ? '9+' : notificationCount}
                          </span>
                        )}
                      </div>
                      {!collapsed && <span className="text-sm">{label}</span>}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
};

export default AppSidebar;

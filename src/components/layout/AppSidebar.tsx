import React from 'react';
import { LayoutDashboard, Plane, BarChart3, Bell, Settings, Compass } from 'lucide-react';
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

export type AppView = 'dashboard' | 'trips' | 'stats' | 'notifications' | 'settings';

interface AppSidebarProps {
  activeView: AppView;
  onViewChange: (view: AppView) => void;
  notificationCount?: number;
}

const NAV_ITEMS: { view: AppView; label: string; icon: React.ElementType }[] = [
  { view: 'dashboard', label: 'לוח בקרה', icon: LayoutDashboard },
  { view: 'trips', label: 'הטיולים שלי', icon: Plane },
  { view: 'stats', label: 'סטטיסטיקה', icon: BarChart3 },
  { view: 'notifications', label: 'הודעות', icon: Bell },
  { view: 'settings', label: 'הגדרות', icon: Settings },
];

const AppSidebar: React.FC<AppSidebarProps> = ({ activeView, onViewChange, notificationCount = 0 }) => {
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';

  return (
    <Sidebar collapsible="icon" side="right" className="border-l border-border">
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-2 justify-end" dir="rtl">
          <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center shrink-0">
            <Compass className="h-5 w-5 text-primary-foreground" />
          </div>
          {!collapsed && (
            <div className="text-right">
              <h2 className="text-lg font-bold font-display text-foreground leading-tight">WonderJourney</h2>
              <p className="text-[10px] text-muted-foreground">המסע הבא שלך מחכה</p>
            </div>
          )}
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {NAV_ITEMS.map(({ view, label, icon: Icon }) => {
                const isActive = activeView === view;
                return (
                  <SidebarMenuItem key={view}>
                    <SidebarMenuButton
                      onClick={() => onViewChange(view)}
                      isActive={isActive}
                      tooltip={label}
                      className={`flex items-center gap-3 justify-end px-3 py-2.5 rounded-xl transition-all ${
                        isActive
                          ? 'bg-primary text-primary-foreground font-semibold shadow-md'
                          : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                      }`}
                    >
                      {!collapsed && <span className="text-sm">{label}</span>}
                      <div className="relative">
                        <Icon className="h-5 w-5" />
                        {view === 'notifications' && notificationCount > 0 && (
                          <span className="absolute -top-1.5 -right-1.5 bg-destructive text-destructive-foreground text-[9px] font-bold rounded-full h-4 w-4 flex items-center justify-center">
                            {notificationCount > 9 ? '9+' : notificationCount}
                          </span>
                        )}
                      </div>
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

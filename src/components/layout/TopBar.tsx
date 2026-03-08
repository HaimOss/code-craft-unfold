import React from 'react';
import { Search } from 'lucide-react';
import UserProfileMenu from '@/components/UserProfileMenu';
import NotificationBell from '@/components/NotificationBell';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Input } from '@/components/ui/input';

interface TopBarProps {
  onLogout: () => void;
  onSelectTrip?: (tripId: string) => void;
}

const TopBar: React.FC<TopBarProps> = ({ onLogout, onSelectTrip }) => {
  return (
    <header className="h-16 border-b border-border bg-card/80 backdrop-blur-sm flex items-center px-4 sm:px-6 gap-4 sticky top-0 z-30" dir="rtl">
      {/* Right: user + notifications */}
      <div className="flex items-center gap-2">
        <UserProfileMenu onLogout={onLogout} />
        <NotificationBell onSelectTrip={onSelectTrip} />
      </div>

      {/* Center: search */}
      <div className="flex-1 max-w-xl mx-auto hidden sm:block">
        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="חפש יעדים, מלונות או טיסות..."
            className="pr-10 bg-secondary/50 border-0 focus-visible:ring-1 rounded-full h-10"
          />
        </div>
      </div>

      {/* Left: sidebar trigger */}
      <div className="ml-auto">
        <SidebarTrigger />
      </div>
    </header>
  );
};

export default TopBar;

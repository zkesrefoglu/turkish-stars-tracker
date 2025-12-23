import { Link, useLocation } from 'react-router-dom';
import { Home, BarChart3, Radio, Newspaper, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { icon: Home, label: 'Home', path: '/' },
  { icon: BarChart3, label: 'Stats', path: '/stats' },
  { icon: Radio, label: 'LIVE', path: '/live', isLive: true },
  { icon: Newspaper, label: 'News', path: '/news' },
  { icon: Users, label: 'Players', path: '/athletes' },
];

export const BottomNav = () => {
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-lg border-t border-border safe-area-pb md:hidden">
      <div className="flex items-center justify-around h-16">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;
          
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex flex-col items-center justify-center flex-1 h-full gap-0.5 transition-all duration-200",
                isActive 
                  ? "text-accent" 
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {item.isLive ? (
                <div className="relative">
                  <Icon className="w-5 h-5" />
                  <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                </div>
              ) : (
                <Icon className="w-5 h-5" />
              )}
              <span className={cn(
                "text-[10px] font-ui uppercase tracking-wider",
                item.isLive && "text-red-500 font-bold"
              )}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

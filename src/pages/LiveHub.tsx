import { MiniHeader } from '@/components/v2/MiniHeader';
import { BottomNav } from '@/components/v2/BottomNav';
import { LiveMatchBanner } from '@/components/v2/LiveMatchBanner';
import { TodaysMatchesCarousel } from '@/components/v2/TodaysMatchesCarousel';
import { TrendingSection } from '@/components/v2/TrendingSection';
import { Newspaper, ChartLineUp, UserCircle, ArrowRight } from '@phosphor-icons/react';
import { Link } from 'react-router-dom';

const LiveHub = () => {
  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <MiniHeader />
      
      {/* Live Match Banner - Shows when matches are live */}
      <LiveMatchBanner />
      
      {/* Main Content */}
      <main className="max-w-3xl mx-auto">
        {/* Today's Matches Carousel */}
        <TodaysMatchesCarousel />
        
        {/* Divider */}
        <div className="h-px bg-border mx-4" />
        
        {/* Trending / Recent Performances */}
        <TrendingSection />
        
        {/* Quick Actions Grid */}
        <div className="px-4 py-6">
          <div className="grid grid-cols-3 gap-3">
            <Link 
              to="/v1" 
              className="flex flex-col items-center gap-2 p-4 bg-card border border-border rounded-xl hover:border-accent/40 transition-all"
            >
              <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center">
                <Newspaper size={20} weight="duotone" className="text-accent" />
              </div>
              <span className="text-xs font-medium text-foreground">News</span>
            </Link>
            
            <Link 
              to="/v1" 
              className="flex flex-col items-center gap-2 p-4 bg-card border border-border rounded-xl hover:border-accent/40 transition-all"
            >
              <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center">
                <ChartLineUp size={20} weight="duotone" className="text-emerald-500" />
              </div>
              <span className="text-xs font-medium text-foreground">Stats</span>
            </Link>
            
            <Link 
              to="/v1" 
              className="flex flex-col items-center gap-2 p-4 bg-card border border-border rounded-xl hover:border-accent/40 transition-all"
            >
              <div className="w-10 h-10 rounded-full bg-orange-500/10 flex items-center justify-center">
                <UserCircle size={20} weight="duotone" className="text-orange-500" />
              </div>
              <span className="text-xs font-medium text-foreground">Athletes</span>
            </Link>
          </div>
          
          {/* View Classic Site Link */}
          <Link 
            to="/v1" 
            className="flex items-center justify-between mt-4 p-4 bg-gradient-to-r from-primary/5 to-accent/5 border border-border rounded-xl hover:border-accent/40 transition-all group"
          >
            <div>
              <p className="text-sm font-medium text-foreground">Explore Full Experience</p>
              <p className="text-xs text-muted-foreground">News, detailed stats & more</p>
            </div>
            <ArrowRight size={20} weight="bold" className="text-accent group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </main>
      
      {/* Mobile Bottom Navigation */}
      <BottomNav />
    </div>
  );
};

export default LiveHub;

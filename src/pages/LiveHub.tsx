import { MiniHeader } from '@/components/v2/MiniHeader';
import { BottomNav } from '@/components/v2/BottomNav';
import { LiveMatchBanner } from '@/components/v2/LiveMatchBanner';
import { TodaysMatchesCarousel } from '@/components/v2/TodaysMatchesCarousel';
import { TrendingSection } from '@/components/v2/TrendingSection';
import { Rocket } from '@phosphor-icons/react';

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
        
        {/* Quick Stats / League Standings - Placeholder for future */}
        <div className="px-4 py-6">
          <div className="bg-gradient-to-br from-primary/5 to-accent/5 border border-border rounded-xl p-6 text-center">
            <div className="flex items-center justify-center gap-2 text-muted-foreground text-sm">
              <Rocket size={18} weight="duotone" className="text-accent" />
              <span>More features coming soon...</span>
            </div>
            <p className="text-xs text-muted-foreground/70 mt-2">
              News Feed • Stats Dashboard • Player Stories
            </p>
          </div>
        </div>
      </main>
      
      {/* Mobile Bottom Navigation */}
      <BottomNav />
    </div>
  );
};

export default LiveHub;

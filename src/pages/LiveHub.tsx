import { MiniHeader } from '@/components/v2/MiniHeader';
import { BottomNav } from '@/components/v2/BottomNav';
import { LiveMatchBanner } from '@/components/v2/LiveMatchBanner';
import { TodaysMatchesCarousel } from '@/components/v2/TodaysMatchesCarousel';
import { TrendingSection } from '@/components/v2/TrendingSection';

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
            <p className="text-muted-foreground text-sm">
              🚀 More features coming soon...
            </p>
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

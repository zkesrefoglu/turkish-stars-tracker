import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface LiveMatch {
  id: string;
  athlete_id: string;
  opponent: string;
  competition: string;
  match_status: string;
  current_minute: number | null;
  home_score: number | null;
  away_score: number | null;
  home_away: string | null;
  athlete_stats: any;
  last_event: string | null;
  athlete?: {
    name: string;
    slug: string;
    photo_url: string | null;
    team: string;
    sport: string;
  };
}

export const LiveMatchBanner = () => {
  const [liveMatches, setLiveMatches] = useState<LiveMatch[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const fetchLiveMatches = async () => {
      const { data } = await supabase
        .from('athlete_live_matches')
        .select(`
          *,
          athlete:athlete_profiles!athlete_id (
            name,
            slug,
            photo_url,
            team,
            sport
          )
        `)
        .in('match_status', ['live', 'halftime'])
        .order('kickoff_time', { ascending: true });

      if (data) {
        setLiveMatches(data.map(m => ({
          ...m,
          athlete: Array.isArray(m.athlete) ? m.athlete[0] : m.athlete
        })));
      }
    };

    fetchLiveMatches();

    // Subscribe to realtime updates
    const channel = supabase
      .channel('live-matches-banner')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'athlete_live_matches'
      }, () => {
        fetchLiveMatches();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Auto-rotate through matches
  useEffect(() => {
    if (liveMatches.length <= 1) return;
    
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % liveMatches.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [liveMatches.length]);

  if (liveMatches.length === 0) return null;

  const currentMatch = liveMatches[currentIndex];
  const athlete = currentMatch.athlete;

  const formatScore = () => {
    const home = currentMatch.home_score ?? 0;
    const away = currentMatch.away_score ?? 0;
    if (currentMatch.home_away === 'home') {
      return `${home} - ${away}`;
    }
    return `${away} - ${home}`;
  };

  return (
    <Link 
      to={athlete ? `/athlete/${athlete.slug}` : '#'}
      className="block"
    >
      <div className="relative overflow-hidden bg-gradient-to-r from-red-600 via-red-500 to-orange-500 text-white">
        {/* Animated background pulse */}
        <div className="absolute inset-0 bg-white/10 animate-pulse" />
        
        <div className="relative px-4 py-3 flex items-center justify-between">
          {/* Left: LIVE badge + athlete */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 bg-white/20 px-2 py-1 rounded-full">
              <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
              <span className="text-xs font-bold uppercase tracking-wider">LIVE</span>
            </div>
            
            {athlete && (
              <div className="flex items-center gap-2">
                {athlete.photo_url && (
                  <img 
                    src={athlete.photo_url} 
                    alt={athlete.name}
                    className="w-8 h-8 rounded-full object-cover border-2 border-white/50"
                  />
                )}
                <div>
                  <p className="font-bold text-sm leading-tight">{athlete.name}</p>
                  <p className="text-[10px] opacity-80">
                    {currentMatch.home_away === 'home' ? 'vs' : '@'} {currentMatch.opponent}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Center: Score */}
          <div className="flex flex-col items-center">
            <span className="text-2xl font-bold tabular-nums">{formatScore()}</span>
            <span className="text-[10px] opacity-80">
              {currentMatch.match_status === 'halftime' 
                ? (athlete?.sport === 'basketball' ? 'Halftime' : 'HT')
                : (athlete?.sport === 'basketball' && currentMatch.last_event
                    ? currentMatch.last_event
                    : `${currentMatch.current_minute}'`
                  )
              }
            </span>
          </div>

          {/* Right: Stats hint */}
          <div className="text-right">
            {currentMatch.last_event && (
              <p className="text-xs font-medium opacity-90">{currentMatch.last_event}</p>
            )}
            {liveMatches.length > 1 && (
              <p className="text-[10px] opacity-70 mt-1">
                {currentIndex + 1}/{liveMatches.length} live
              </p>
            )}
          </div>
        </div>

        {/* Progress dots */}
        {liveMatches.length > 1 && (
          <div className="absolute bottom-1 left-1/2 -translate-x-1/2 flex gap-1">
            {liveMatches.map((_, idx) => (
              <span
                key={idx}
                className={cn(
                  "w-1.5 h-1.5 rounded-full transition-all duration-300",
                  idx === currentIndex ? "bg-white" : "bg-white/40"
                )}
              />
            ))}
          </div>
        )}
      </div>
    </Link>
  );
};

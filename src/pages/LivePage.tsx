import { useState, useEffect } from 'react';
import { MiniHeader } from '@/components/v2/MiniHeader';
import { BottomNav } from '@/components/v2/BottomNav';
import { supabase } from '@/integrations/supabase/client';
import { Link } from 'react-router-dom';
import { Broadcast, Clock, CalendarBlank, CheckCircle } from '@phosphor-icons/react';
import { format, formatDistanceToNow, isToday, isTomorrow, parseISO } from 'date-fns';

interface LiveMatch {
  id: string;
  athlete_id: string;
  opponent: string;
  competition: string;
  home_away: string | null;
  home_score: number | null;
  away_score: number | null;
  current_minute: number | null;
  match_status: string;
  kickoff_time: string;
  athlete: {
    name: string;
    slug: string;
    photo_url: string | null;
    team: string;
    sport: string;
  };
}

interface UpcomingMatch {
  id: string;
  athlete_id: string;
  opponent: string;
  competition: string;
  home_away: string | null;
  match_date: string;
  athlete: {
    name: string;
    slug: string;
    photo_url: string | null;
    team: string;
    sport: string;
  };
}

const LivePage = () => {
  const [liveMatches, setLiveMatches] = useState<LiveMatch[]>([]);
  const [upcomingMatches, setUpcomingMatches] = useState<UpcomingMatch[]>([]);
  const [recentMatches, setRecentMatches] = useState<LiveMatch[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const now = new Date();
      const twoDaysLater = new Date(now.getTime() + 48 * 60 * 60 * 1000);

      const [liveRes, upcomingRes, recentRes] = await Promise.all([
        supabase
          .from('athlete_live_matches')
          .select('*, athlete:athlete_profiles!athlete_id(name, slug, photo_url, team, sport)')
          .in('match_status', ['live', 'halftime'])
          .order('kickoff_time', { ascending: true }),
        supabase
          .from('athlete_upcoming_matches')
          .select('*, athlete:athlete_profiles!athlete_id(name, slug, photo_url, team, sport)')
          .gte('match_date', now.toISOString())
          .lte('match_date', twoDaysLater.toISOString())
          .order('match_date', { ascending: true }),
        supabase
          .from('athlete_live_matches')
          .select('*, athlete:athlete_profiles!athlete_id(name, slug, photo_url, team, sport)')
          .eq('match_status', 'finished')
          .order('kickoff_time', { ascending: false })
          .limit(5)
      ]);

      if (liveRes.data) setLiveMatches(liveRes.data as LiveMatch[]);
      if (upcomingRes.data) setUpcomingMatches(upcomingRes.data as UpcomingMatch[]);
      if (recentRes.data) setRecentMatches(recentRes.data as LiveMatch[]);
      setLoading(false);
    };

    fetchData();

    // Set up realtime subscription for live matches
    const channel = supabase
      .channel('live-matches-page')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'athlete_live_matches' }, () => {
        fetchData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const formatScore = (match: LiveMatch) => {
    const isHome = match.home_away === 'home';
    const teamScore = isHome ? match.home_score : match.away_score;
    const oppScore = isHome ? match.away_score : match.home_score;
    return `${teamScore ?? 0} - ${oppScore ?? 0}`;
  };

  const formatMatchTime = (dateStr: string) => {
    const date = parseISO(dateStr);
    if (isToday(date)) return `Today, ${format(date, 'HH:mm')}`;
    if (isTomorrow(date)) return `Tomorrow, ${format(date, 'HH:mm')}`;
    return format(date, 'EEE, MMM d • HH:mm');
  };

  const getTimeUntil = (dateStr: string) => {
    return formatDistanceToNow(parseISO(dateStr), { addSuffix: true });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background pb-20 md:pb-0">
        <MiniHeader />
        <div className="flex items-center justify-center h-64">
          <div className="animate-pulse text-muted-foreground">Loading matches...</div>
        </div>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <MiniHeader />
      
      <main className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        {/* Page Title */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center">
            <Broadcast size={20} weight="duotone" className="text-destructive" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Live & Upcoming</h1>
            <p className="text-sm text-muted-foreground">Track matches in real-time</p>
          </div>
        </div>

        {/* Live Now Section */}
        {liveMatches.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-4">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-destructive"></span>
              </span>
              <h2 className="text-lg font-semibold text-foreground">Live Now</h2>
            </div>
            
            <div className="space-y-3">
              {liveMatches.map(match => (
                <Link
                  key={match.id}
                  to={`/athlete/${match.athlete.slug}`}
                  className="block p-4 bg-gradient-to-r from-destructive/5 to-card border border-destructive/30 rounded-xl hover:border-destructive/50 transition-all"
                >
                  <div className="flex items-center gap-4">
                    <img
                      src={match.athlete.photo_url || '/placeholder.svg'}
                      alt={match.athlete.name}
                      className="w-14 h-14 rounded-full object-cover border-2 border-destructive/30"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-foreground">{match.athlete.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {match.athlete.team} vs {match.opponent}
                      </p>
                      <p className="text-xs text-muted-foreground">{match.competition}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-foreground">{formatScore(match)}</p>
                      <div className="flex items-center gap-1 justify-end">
                        <span className="text-xs font-medium text-destructive">
                          {match.match_status === 'halftime' ? 'HT' : `${match.current_minute}'`}
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Upcoming Matches */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Clock size={18} weight="bold" className="text-accent" />
            <h2 className="text-lg font-semibold text-foreground">Upcoming (48h)</h2>
          </div>
          
          {upcomingMatches.length === 0 ? (
            <div className="p-6 bg-card border border-border rounded-xl text-center">
              <CalendarBlank size={32} className="mx-auto text-muted-foreground mb-2" />
              <p className="text-muted-foreground">No upcoming matches in the next 48 hours</p>
            </div>
          ) : (
            <div className="space-y-3">
              {upcomingMatches.map(match => (
                <Link
                  key={match.id}
                  to={`/athlete/${match.athlete.slug}`}
                  className="flex items-center gap-4 p-4 bg-card border border-border rounded-xl hover:border-accent/40 transition-all"
                >
                  <img
                    src={match.athlete.photo_url || '/placeholder.svg'}
                    alt={match.athlete.name}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-foreground">{match.athlete.name}</p>
                    <p className="text-sm text-muted-foreground">
                      vs {match.opponent} ({match.home_away})
                    </p>
                    <p className="text-xs text-muted-foreground">{match.competition}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-foreground">{formatMatchTime(match.match_date)}</p>
                    <p className="text-xs text-accent">{getTimeUntil(match.match_date)}</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* Recently Finished */}
        {recentMatches.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-4">
              <CheckCircle size={18} weight="bold" className="text-emerald-500" />
              <h2 className="text-lg font-semibold text-foreground">Recently Finished</h2>
            </div>
            
            <div className="space-y-2">
              {recentMatches.map(match => (
                <Link
                  key={match.id}
                  to={`/athlete/${match.athlete.slug}`}
                  className="flex items-center gap-3 p-3 bg-card border border-border rounded-lg hover:border-accent/40 transition-all opacity-75"
                >
                  <img
                    src={match.athlete.photo_url || '/placeholder.svg'}
                    alt={match.athlete.name}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground truncate">{match.athlete.name}</p>
                    <p className="text-xs text-muted-foreground">vs {match.opponent}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-foreground">{formatScore(match)}</p>
                    <p className="text-xs text-muted-foreground">FT</p>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Empty State */}
        {liveMatches.length === 0 && upcomingMatches.length === 0 && recentMatches.length === 0 && (
          <div className="p-8 text-center">
            <Broadcast size={48} className="mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">No Matches</h3>
            <p className="text-muted-foreground">Check back later for live and upcoming matches</p>
          </div>
        )}
      </main>
      
      <BottomNav />
    </div>
  );
};

export default LivePage;

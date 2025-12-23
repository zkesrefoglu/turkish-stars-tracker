import { useState, useEffect } from 'react';
import { MiniHeader } from '@/components/v2/MiniHeader';
import { BottomNav } from '@/components/v2/BottomNav';
import { supabase } from '@/integrations/supabase/client';
import { Link } from 'react-router-dom';
import { Trophy, Basketball, SoccerBall, TrendUp, Star } from '@phosphor-icons/react';

interface AthleteStats {
  id: string;
  athlete_id: string;
  season: string;
  competition: string;
  games_played: number | null;
  stats: Record<string, unknown> | null;
  athlete: {
    name: string;
    slug: string;
    photo_url: string | null;
    team: string;
    sport: string;
  };
}

interface RecentPerformance {
  id: string;
  athlete_id: string;
  date: string;
  rating: number | null;
  stats: Record<string, unknown> | null;
  opponent: string | null;
  competition: string | null;
  athlete: {
    name: string;
    slug: string;
    photo_url: string | null;
    team: string;
    sport: string;
  };
}

const StatsPage = () => {
  const [seasonStats, setSeasonStats] = useState<AthleteStats[]>([]);
  const [recentPerformances, setRecentPerformances] = useState<RecentPerformance[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const [statsRes, performancesRes] = await Promise.all([
        supabase
          .from('athlete_season_stats')
          .select('*, athlete:athlete_profiles!athlete_id(name, slug, photo_url, team, sport)')
          .eq('season', '2024-25')
          .order('games_played', { ascending: false }),
        supabase
          .from('athlete_daily_updates')
          .select('*, athlete:athlete_profiles!athlete_id(name, slug, photo_url, team, sport)')
          .eq('played', true)
          .not('rating', 'is', null)
          .order('date', { ascending: false })
          .order('rating', { ascending: false })
          .limit(10)
      ]);

      if (statsRes.data) setSeasonStats(statsRes.data as AthleteStats[]);
      if (performancesRes.data) setRecentPerformances(performancesRes.data as RecentPerformance[]);
      setLoading(false);
    };

    fetchData();
  }, []);

  const formatStat = (stats: Record<string, unknown> | null, sport: string) => {
    if (!stats) return '-';
    if (sport === 'basketball') {
      const pts = stats.points || 0;
      const reb = stats.rebounds || 0;
      const ast = stats.assists || 0;
      return `${pts}pts ${reb}reb ${ast}ast`;
    }
    // Football
    const goals = stats.goals || 0;
    const assists = stats.assists || 0;
    return `${goals}G ${assists}A`;
  };

  const getRatingColor = (rating: number | null) => {
    if (!rating) return 'text-muted-foreground';
    if (rating >= 8) return 'text-emerald-500';
    if (rating >= 7) return 'text-accent';
    if (rating >= 6) return 'text-yellow-500';
    return 'text-destructive';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background pb-20 md:pb-0">
        <MiniHeader />
        <div className="flex items-center justify-center h-64">
          <div className="animate-pulse text-muted-foreground">Loading stats...</div>
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
          <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center">
            <Trophy size={20} weight="duotone" className="text-accent" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Statistics</h1>
            <p className="text-sm text-muted-foreground">Season performance & rankings</p>
          </div>
        </div>

        {/* Top Performers - Recent */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Star size={18} weight="fill" className="text-yellow-500" />
            <h2 className="text-lg font-semibold text-foreground">Top Performers</h2>
          </div>
          
          <div className="space-y-3">
            {recentPerformances.slice(0, 5).map((perf, index) => (
              <Link
                key={perf.id}
                to={`/athlete/${perf.athlete.slug}`}
                className="flex items-center gap-4 p-4 bg-card border border-border rounded-xl hover:border-accent/40 transition-all"
              >
                <span className="text-lg font-bold text-muted-foreground w-6">{index + 1}</span>
                <img
                  src={perf.athlete.photo_url || '/placeholder.svg'}
                  alt={perf.athlete.name}
                  className="w-12 h-12 rounded-full object-cover border-2 border-border"
                />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-foreground truncate">{perf.athlete.name}</p>
                  <p className="text-sm text-muted-foreground">
                    vs {perf.opponent} • {perf.competition}
                  </p>
                </div>
                <div className="text-right">
                  <p className={`text-xl font-bold ${getRatingColor(perf.rating)}`}>
                    {perf.rating?.toFixed(1)}
                  </p>
                  <p className="text-xs text-muted-foreground">rating</p>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* Season Stats by Sport */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <TrendUp size={18} weight="bold" className="text-emerald-500" />
            <h2 className="text-lg font-semibold text-foreground">Season Stats</h2>
          </div>

          {/* Football Players */}
          {seasonStats.filter(s => s.athlete.sport === 'football').length > 0 && (
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <SoccerBall size={16} weight="fill" className="text-muted-foreground" />
                <span className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Football</span>
              </div>
              <div className="space-y-2">
                {seasonStats
                  .filter(s => s.athlete.sport === 'football')
                  .map(stat => (
                    <Link
                      key={stat.id}
                      to={`/athlete/${stat.athlete.slug}`}
                      className="flex items-center gap-3 p-3 bg-card border border-border rounded-lg hover:border-accent/40 transition-all"
                    >
                      <img
                        src={stat.athlete.photo_url || '/placeholder.svg'}
                        alt={stat.athlete.name}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground truncate">{stat.athlete.name}</p>
                        <p className="text-xs text-muted-foreground">{stat.athlete.team}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-foreground">
                          {formatStat(stat.stats, 'football')}
                        </p>
                        <p className="text-xs text-muted-foreground">{stat.games_played} games</p>
                      </div>
                    </Link>
                  ))}
              </div>
            </div>
          )}

          {/* Basketball Players */}
          {seasonStats.filter(s => s.athlete.sport === 'basketball').length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Basketball size={16} weight="fill" className="text-muted-foreground" />
                <span className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Basketball</span>
              </div>
              <div className="space-y-2">
                {seasonStats
                  .filter(s => s.athlete.sport === 'basketball')
                  .map(stat => (
                    <Link
                      key={stat.id}
                      to={`/athlete/${stat.athlete.slug}`}
                      className="flex items-center gap-3 p-3 bg-card border border-border rounded-lg hover:border-accent/40 transition-all"
                    >
                      <img
                        src={stat.athlete.photo_url || '/placeholder.svg'}
                        alt={stat.athlete.name}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground truncate">{stat.athlete.name}</p>
                        <p className="text-xs text-muted-foreground">{stat.athlete.team}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-foreground">
                          {formatStat(stat.stats, 'basketball')}
                        </p>
                        <p className="text-xs text-muted-foreground">{stat.games_played} games</p>
                      </div>
                    </Link>
                  ))}
              </div>
            </div>
          )}
        </section>
      </main>
      
      <BottomNav />
    </div>
  );
};

export default StatsPage;

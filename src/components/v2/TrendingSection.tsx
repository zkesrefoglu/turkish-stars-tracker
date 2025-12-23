import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { TrendUp, CaretRight, User, SoccerBall, Basketball } from '@phosphor-icons/react';
import { Badge } from '@/components/ui/badge';

interface DailyUpdate {
  id: string;
  athlete_id: string;
  date: string;
  played: boolean;
  stats: any;
  rating: number | null;
  match_result: string | null;
  opponent: string | null;
  competition: string | null;
  athlete?: {
    name: string;
    slug: string;
    photo_url: string | null;
    team: string;
    sport: string;
  };
}

export const TrendingSection = () => {
  const [recentUpdates, setRecentUpdates] = useState<DailyUpdate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTrending = async () => {
      // Get recent performances with good stats
      const { data } = await supabase
        .from('athlete_daily_updates')
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
        .eq('played', true)
        .order('date', { ascending: false })
        .limit(5);

      if (data) {
        setRecentUpdates(data.map(u => ({
          ...u,
          athlete: Array.isArray(u.athlete) ? u.athlete[0] : u.athlete
        })));
      }
      setLoading(false);
    };

    fetchTrending();
  }, []);

  const formatStats = (update: DailyUpdate) => {
    const { stats, athlete } = update;
    if (!stats || !athlete) return null;

    if (athlete.sport === 'basketball') {
      const pts = stats.points ?? 0;
      const reb = stats.rebounds ?? 0;
      const ast = stats.assists ?? 0;
      return `${pts} PTS • ${reb} REB • ${ast} AST`;
    } else {
      const goals = stats.goals ?? 0;
      const assists = stats.assists ?? 0;
      const rating = stats.rating;
      if (goals > 0 || assists > 0) {
        return `${goals}G ${assists}A${rating ? ` • ${rating.toFixed(1)}★` : ''}`;
      }
      return rating ? `${rating.toFixed(1)}★` : null;
    }
  };

  const getResultBadge = (result: string | null) => {
    if (!result) return null;
    const isWin = result.toLowerCase().startsWith('w');
    const isLoss = result.toLowerCase().startsWith('l');
    return (
      <Badge className={
        isWin ? 'bg-emerald-500/20 text-emerald-600 border-emerald-500/30' :
        isLoss ? 'bg-red-500/20 text-red-600 border-red-500/30' :
        'bg-muted text-muted-foreground'
      }>
        {result}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="px-4 py-4">
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-muted rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (recentUpdates.length === 0) return null;

  return (
    <div className="py-4">
      {/* Header */}
      <div className="flex items-center justify-between px-4 mb-3">
        <div className="flex items-center gap-2">
          <TrendUp size={20} weight="duotone" className="text-accent" />
          <h2 className="font-headline text-lg font-bold text-foreground">Recent Performances</h2>
        </div>
        <Link to="/athletes" className="flex items-center gap-1 text-xs text-accent font-medium">
          More <CaretRight size={16} weight="bold" />
        </Link>
      </div>

      {/* Updates List */}
      <div className="px-4 space-y-2.5">
        {recentUpdates.map((update) => {
          const athlete = update.athlete;
          const statsLine = formatStats(update);
          const SportIcon = athlete?.sport === 'basketball' ? Basketball : SoccerBall;

          return (
            <Link
              key={update.id}
              to={athlete ? `/athlete/${athlete.slug}` : '#'}
              className="block"
            >
              <div className="flex items-center gap-3 p-3.5 bg-card border border-border rounded-lg hover:border-accent/40 transition-all duration-200 border-l-2 border-l-accent/50">
                {/* Avatar */}
                {athlete?.photo_url ? (
                  <img 
                    src={athlete.photo_url} 
                    alt={athlete.name}
                    className="w-16 h-16 rounded-full object-cover object-[center_10%] border-2 border-border"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                    <User size={28} weight="duotone" className="text-muted-foreground" />
                  </div>
                )}

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <SportIcon size={14} weight="duotone" className="text-muted-foreground flex-shrink-0" />
                    <p className="font-semibold text-sm text-foreground truncate">
                      {athlete?.name || 'Unknown'}
                    </p>
                    {getResultBadge(update.match_result)}
                  </div>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">
                    vs {update.opponent} • {update.competition}
                  </p>
                </div>

                {/* Stats */}
                {statsLine && (
                  <div className="text-right">
                    <p className="text-xs font-bold text-accent">{statsLine}</p>
                  </div>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
};

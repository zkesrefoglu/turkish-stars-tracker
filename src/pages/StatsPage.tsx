import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { MiniHeader } from "@/components/v2/MiniHeader";
import { BottomNav } from "@/components/v2/BottomNav";
import { supabase } from "@/integrations/supabase/client";
import {
  Trophy,
  Star,
  SoccerBall,
  Basketball,
  Target,
  HandsClapping,
  Timer,
  CaretRight,
  Funnel,
  SortAscending,
  SortDescending,
  TrendUp,
  TrendDown,
  Minus
} from "@phosphor-icons/react";

// ============================================================================
// INTERFACES
// ============================================================================

interface AthleteProfile {
  id: string;
  name: string;
  slug: string;
  sport: string;
  team: string;
  league: string;
  photo_url: string | null;
  position: string;
}

interface DailyUpdate {
  id: string;
  athlete_id: string;
  date: string;
  played: boolean;
  match_result: string | null;
  opponent: string | null;
  competition: string | null;
  stats: any;
  rating: number | null;
  minutes_played: number | null;
}

interface SeasonStats {
  id: string;
  athlete_id: string;
  season: string;
  competition: string;
  games_played: number | null;
  stats: any;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

const getRatingColor = (rating: number | null): string => {
  if (!rating) return "text-muted-foreground";
  if (rating >= 8) return "text-emerald-500";
  if (rating >= 7) return "text-blue-500";
  if (rating >= 6) return "text-yellow-500";
  return "text-red-500";
};

const getRatingBg = (rating: number | null): string => {
  if (!rating) return "bg-muted";
  if (rating >= 8) return "bg-emerald-100 dark:bg-emerald-900/30";
  if (rating >= 7) return "bg-blue-100 dark:bg-blue-900/30";
  if (rating >= 6) return "bg-yellow-100 dark:bg-yellow-900/30";
  return "bg-red-100 dark:bg-red-900/30";
};

// Calculate trend from recent games using linear regression
const calculateTrend = (games: { rating: number | null; date: string }[], minGames: number = 3): "up" | "down" | "stable" | null => {
  // Filter games with valid ratings and sort by date ascending
  const validGames = games
    .filter(g => g.rating && g.rating > 0)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  
  if (validGames.length < minGames) return null;
  
  // Take last N games for trend calculation
  const recentGames = validGames.slice(-8);
  if (recentGames.length < minGames) return null;
  
  // Linear regression to find slope
  const n = recentGames.length;
  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
  
  recentGames.forEach((game, i) => {
    const x = i;
    const y = game.rating!;
    sumX += x;
    sumY += y;
    sumXY += x * y;
    sumX2 += x * x;
  });
  
  const denominator = (n * sumX2 - sumX * sumX);
  if (denominator === 0) return "stable";
  
  const slope = (n * sumXY - sumX * sumY) / denominator;
  
  // Threshold for determining trend direction
  const threshold = 0.05;
  if (slope > threshold) return "up";
  if (slope < -threshold) return "down";
  return "stable";
};

// Calculate NBA trend based on recent PPG
const calculateNBATrend = (games: DailyUpdate[], minGames: number = 3): "up" | "down" | "stable" | null => {
  const validGames = games
    .filter(g => g.played && g.stats?.pts !== undefined)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  
  if (validGames.length < minGames) return null;
  
  const recentGames = validGames.slice(-10);
  if (recentGames.length < minGames) return null;
  
  const n = recentGames.length;
  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
  
  recentGames.forEach((game, i) => {
    const x = i;
    const y = game.stats?.pts || 0;
    sumX += x;
    sumY += y;
    sumXY += x * y;
    sumX2 += x * x;
  });
  
  const denominator = (n * sumX2 - sumX * sumX);
  if (denominator === 0) return "stable";
  
  const slope = (n * sumXY - sumX * sumY) / denominator;
  
  // Higher threshold for NBA points (larger numbers)
  const threshold = 0.3;
  if (slope > threshold) return "up";
  if (slope < -threshold) return "down";
  return "stable";
};

// Trend indicator component
const TrendIndicator = ({ trend }: { trend: "up" | "down" | "stable" | null }) => {
  if (!trend) return null;
  
  if (trend === "up") {
    return <TrendUp size={14} weight="bold" className="text-emerald-500" />;
  }
  if (trend === "down") {
    return <TrendDown size={14} weight="bold" className="text-red-500" />;
  }
  return <Minus size={12} weight="bold" className="text-muted-foreground" />;
};

// Aggregate season stats for an athlete
const aggregateSeasonStats = (stats: SeasonStats[], athleteId: string, sport: string) => {
  const athleteStats = stats.filter(s => s.athlete_id === athleteId);
  
  if (sport === "basketball") {
    const nbaStats = athleteStats.find(s => s.competition === "NBA");
    if (nbaStats?.stats) {
      return {
        ppg: nbaStats.stats.ppg || 0,
        rpg: nbaStats.stats.rpg || 0,
        apg: nbaStats.stats.apg || 0,
        gamesPlayed: nbaStats.games_played || 0
      };
    }
    return { ppg: 0, rpg: 0, apg: 0, gamesPlayed: 0 };
  }
  
  // Football - aggregate across competitions
  let totalGoals = 0;
  let totalAssists = 0;
  let totalGames = 0;
  let ratingSum = 0;
  let ratingCount = 0;
  
  athleteStats.forEach(s => {
    if (s.stats) {
      totalGoals += s.stats.goals || 0;
      totalAssists += s.stats.assists || 0;
      if (s.stats.rating && s.stats.rating > 0) {
        ratingSum += s.stats.rating;
        ratingCount++;
      }
    }
    totalGames += s.games_played || 0;
  });
  
  return {
    goals: totalGoals,
    assists: totalAssists,
    rating: ratingCount > 0 ? ratingSum / ratingCount : null,
    gamesPlayed: totalGames
  };
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const StatsPage = () => {
  const [athletes, setAthletes] = useState<AthleteProfile[]>([]);
  const [dailyUpdates, setDailyUpdates] = useState<DailyUpdate[]>([]);
  const [seasonStats, setSeasonStats] = useState<SeasonStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [sportFilter, setSportFilter] = useState<"all" | "football" | "basketball">("all");

  useEffect(() => {
    const fetchData = async () => {
      const [athletesRes, updatesRes, statsRes] = await Promise.all([
        supabase.from("athlete_profiles").select("*").order("name"),
        supabase.from("athlete_daily_updates").select("*").order("date", { ascending: false }),
        supabase.from("athlete_season_stats").select("*").ilike("season", "%24%")
      ]);

      if (athletesRes.data) setAthletes(athletesRes.data);
      if (updatesRes.data) setDailyUpdates(updatesRes.data);
      if (statsRes.data) setSeasonStats(statsRes.data);
      setLoading(false);
    };

    fetchData();
  }, []);

  // Get athlete by ID
  const getAthlete = (id: string) => athletes.find(a => a.id === id);

  // Filter athletes by sport
  const filteredAthletes = athletes.filter(a => 
    sportFilter === "all" || a.sport === sportFilter
  );

  // Get top performers - sorted by AVERAGE RATING across all matches
  const topPerformers = (() => {
    // Group updates by athlete and calculate average rating
    const athleteRatings: { [athleteId: string]: { total: number; count: number; games: DailyUpdate[] } } = {};
    
    dailyUpdates.forEach(u => {
      const athlete = getAthlete(u.athlete_id);
      if (!athlete) return;
      if (sportFilter !== "all" && athlete.sport !== sportFilter) return;
      if (!u.played || !u.rating || u.rating <= 0) return;
      
      if (!athleteRatings[u.athlete_id]) {
        athleteRatings[u.athlete_id] = { total: 0, count: 0, games: [] };
      }
      athleteRatings[u.athlete_id].total += u.rating;
      athleteRatings[u.athlete_id].count += 1;
      athleteRatings[u.athlete_id].games.push(u);
    });
    
    // Calculate averages, trends, and sort
    return Object.entries(athleteRatings)
      .map(([athleteId, data]) => {
        const trend = calculateTrend(data.games.map(g => ({ rating: g.rating, date: g.date })));
        return {
          athleteId,
          avgRating: data.total / data.count,
          gamesPlayed: data.count,
          lastGame: data.games[0], // Most recent game for context
          trend
        };
      })
      .filter(item => item.gamesPlayed >= 1) // At least 1 rated game
      .sort((a, b) => b.avgRating - a.avgRating)
      .slice(0, 10);
  })();

  // Get top scorers (football) - aggregate goals
  const footballAthletes = athletes.filter(a => a.sport === "football");
  const topScorers = footballAthletes
    .map(athlete => ({
      athlete,
      stats: aggregateSeasonStats(seasonStats, athlete.id, "football")
    }))
    .filter(item => item.stats.goals > 0)
    .sort((a, b) => b.stats.goals - a.stats.goals)
    .slice(0, 10);

  // Get top assists (football)
  const topAssists = footballAthletes
    .map(athlete => ({
      athlete,
      stats: aggregateSeasonStats(seasonStats, athlete.id, "football")
    }))
    .filter(item => item.stats.assists > 0)
    .sort((a, b) => b.stats.assists - a.stats.assists)
    .slice(0, 10);

  // Get NBA stats with trends
  const basketballAthletes = athletes.filter(a => a.sport === "basketball");
  const nbaLeaders = basketballAthletes
    .map(athlete => {
      const athleteGames = dailyUpdates.filter(u => u.athlete_id === athlete.id);
      const trend = calculateNBATrend(athleteGames);
      return {
        athlete,
        stats: aggregateSeasonStats(seasonStats, athlete.id, "basketball"),
        trend
      };
    })
    .filter(item => item.stats.gamesPlayed > 0)
    .sort((a, b) => b.stats.ppg - a.stats.ppg);

  if (loading) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <MiniHeader />
        <div className="flex items-center justify-center h-64">
          <div className="animate-pulse flex flex-col items-center gap-2">
            <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
            <span className="text-sm text-muted-foreground">Loading stats...</span>
          </div>
        </div>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <MiniHeader />

      <main className="max-w-3xl mx-auto px-4 py-6">
        {/* Page Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-rose-100 dark:bg-rose-900/30 rounded-xl flex items-center justify-center">
              <Trophy size={24} weight="duotone" className="text-rose-600 dark:text-rose-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Statistics</h1>
              <p className="text-sm text-muted-foreground">Season performance & rankings</p>
            </div>
          </div>
        </div>

        {/* Sport Filter */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          <button
            onClick={() => setSportFilter("all")}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all flex-shrink-0 ${
              sportFilter === "all"
                ? "bg-accent text-accent-foreground"
                : "bg-card border border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            All Sports
          </button>
          <button
            onClick={() => setSportFilter("football")}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all flex-shrink-0 flex items-center gap-1.5 ${
              sportFilter === "football"
                ? "bg-accent text-accent-foreground"
                : "bg-card border border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            <SoccerBall size={14} weight="fill" />
            Football
          </button>
          <button
            onClick={() => setSportFilter("basketball")}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all flex-shrink-0 flex items-center gap-1.5 ${
              sportFilter === "basketball"
                ? "bg-accent text-accent-foreground"
                : "bg-card border border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            <Basketball size={14} weight="fill" />
            Basketball
          </button>
        </div>

        {/* TOP PERFORMERS - Sorted by Rating */}
        <section className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Star size={20} weight="fill" className="text-yellow-500" />
            <h2 className="font-bold text-foreground">Top Performers</h2>
            <span className="text-xs text-muted-foreground ml-auto flex items-center gap-1">
              <SortDescending size={12} />
              By avg rating
            </span>
          </div>

          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            {topPerformers.length > 0 ? (
              <div className="divide-y divide-border">
                {topPerformers.map((item, index) => {
                  const athlete = getAthlete(item.athleteId);
                  if (!athlete) return null;

                  return (
                    <Link
                      key={item.athleteId}
                      to={`/athlete/${athlete.slug}`}
                      className="flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors"
                    >
                      {/* Rank */}
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                        index === 0 ? "bg-yellow-400 text-yellow-900" :
                        index === 1 ? "bg-gray-300 text-gray-700" :
                        index === 2 ? "bg-orange-400 text-orange-900" :
                        "bg-muted text-muted-foreground"
                      }`}>
                        {index + 1}
                      </div>

                      {/* Photo */}
                      <img
                        src={athlete.photo_url || "/placeholder.svg"}
                        alt={athlete.name}
                        className="w-10 h-10 rounded-full object-cover"
                      />

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-foreground truncate">{athlete.name}</div>
                        <div className="text-xs text-muted-foreground truncate">
                          {athlete.team} • {item.gamesPlayed} games
                        </div>
                      </div>

                      {/* Average Rating with Trend */}
                      <div className="flex items-center gap-2">
                        <TrendIndicator trend={item.trend} />
                        <div className={`text-right ${getRatingBg(item.avgRating)} px-3 py-1 rounded-lg`}>
                          <div className={`text-lg font-bold ${getRatingColor(item.avgRating)}`}>
                            {item.avgRating.toFixed(1)}
                          </div>
                          <div className="text-[10px] text-muted-foreground">avg rating</div>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <div className="py-8 text-center text-muted-foreground">
                No performances with ratings yet
              </div>
            )}
          </div>
        </section>

        {/* FOOTBALL STATS */}
        {(sportFilter === "all" || sportFilter === "football") && (
          <>
            {/* Top Scorers */}
            <section className="mb-8">
              <div className="flex items-center gap-2 mb-4">
                <Target size={20} weight="duotone" className="text-emerald-500" />
                <h2 className="font-bold text-foreground">Top Scorers</h2>
                <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
                  Season 24/25
                </span>
              </div>

              <div className="bg-card border border-border rounded-2xl overflow-hidden">
                {topScorers.length > 0 ? (
                  <div className="divide-y divide-border">
                    {topScorers.map((item, index) => (
                      <Link
                        key={item.athlete.id}
                        to={`/athlete/${item.athlete.slug}`}
                        className="flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors"
                      >
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                          index === 0 ? "bg-yellow-400 text-yellow-900" :
                          index === 1 ? "bg-gray-300 text-gray-700" :
                          index === 2 ? "bg-orange-400 text-orange-900" :
                          "bg-muted text-muted-foreground"
                        }`}>
                          {index + 1}
                        </div>

                        <img
                          src={item.athlete.photo_url || "/placeholder.svg"}
                          alt={item.athlete.name}
                          className="w-10 h-10 rounded-full object-cover"
                        />

                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-foreground truncate">{item.athlete.name}</div>
                          <div className="text-xs text-muted-foreground">{item.athlete.team}</div>
                        </div>

                        <div className="text-right">
                          <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                            {item.stats.goals}
                          </div>
                          <div className="text-[10px] text-muted-foreground">goals</div>
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="py-8 text-center text-muted-foreground">
                    No goals recorded yet
                  </div>
                )}
              </div>
            </section>

            {/* Top Assists */}
            <section className="mb-8">
              <div className="flex items-center gap-2 mb-4">
                <HandsClapping size={20} weight="duotone" className="text-blue-500" />
                <h2 className="font-bold text-foreground">Top Assists</h2>
                <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
                  Season 24/25
                </span>
              </div>

              <div className="bg-card border border-border rounded-2xl overflow-hidden">
                {topAssists.length > 0 ? (
                  <div className="divide-y divide-border">
                    {topAssists.map((item, index) => (
                      <Link
                        key={item.athlete.id}
                        to={`/athlete/${item.athlete.slug}`}
                        className="flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors"
                      >
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                          index === 0 ? "bg-yellow-400 text-yellow-900" :
                          index === 1 ? "bg-gray-300 text-gray-700" :
                          index === 2 ? "bg-orange-400 text-orange-900" :
                          "bg-muted text-muted-foreground"
                        }`}>
                          {index + 1}
                        </div>

                        <img
                          src={item.athlete.photo_url || "/placeholder.svg"}
                          alt={item.athlete.name}
                          className="w-10 h-10 rounded-full object-cover"
                        />

                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-foreground truncate">{item.athlete.name}</div>
                          <div className="text-xs text-muted-foreground">{item.athlete.team}</div>
                        </div>

                        <div className="text-right">
                          <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
                            {item.stats.assists}
                          </div>
                          <div className="text-[10px] text-muted-foreground">assists</div>
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="py-8 text-center text-muted-foreground">
                    No assists recorded yet
                  </div>
                )}
              </div>
            </section>
          </>
        )}

        {/* NBA STATS */}
        {(sportFilter === "all" || sportFilter === "basketball") && nbaLeaders.length > 0 && (
          <section className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <Basketball size={20} weight="duotone" className="text-orange-500" />
              <h2 className="font-bold text-foreground">NBA Stats</h2>
              <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
                2024-25 Season
              </span>
            </div>

            <div className="bg-card border border-border rounded-2xl overflow-hidden">
              <div className="divide-y divide-border">
                {nbaLeaders.map((item, index) => (
                  <Link
                    key={item.athlete.id}
                    to={`/athlete/${item.athlete.slug}`}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors"
                  >
                    <img
                      src={item.athlete.photo_url || "/placeholder.svg"}
                      alt={item.athlete.name}
                      className="w-12 h-12 rounded-full object-cover"
                    />

                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-foreground truncate">{item.athlete.name}</div>
                      <div className="text-xs text-muted-foreground">{item.athlete.team}</div>
                    </div>

                    <div className="flex items-center gap-2">
                      <TrendIndicator trend={item.trend} />
                      <div className="grid grid-cols-4 gap-3 text-center">
                        <div>
                          <div className="text-sm font-bold text-foreground">{item.stats.ppg.toFixed(1)}</div>
                          <div className="text-[10px] text-muted-foreground">PPG</div>
                        </div>
                        <div>
                          <div className="text-sm font-bold text-foreground">{item.stats.rpg.toFixed(1)}</div>
                          <div className="text-[10px] text-muted-foreground">RPG</div>
                        </div>
                        <div>
                          <div className="text-sm font-bold text-foreground">{item.stats.apg.toFixed(1)}</div>
                          <div className="text-[10px] text-muted-foreground">APG</div>
                        </div>
                        <div>
                          <div className="text-sm font-bold text-foreground">{item.stats.gamesPlayed}</div>
                          <div className="text-[10px] text-muted-foreground">GP</div>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}
      </main>

      <BottomNav />
    </div>
  );
};

export default StatsPage;

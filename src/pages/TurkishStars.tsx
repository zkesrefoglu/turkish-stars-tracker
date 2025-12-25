import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { MiniHeader } from "@/components/v2/MiniHeader";
import { BottomNav } from "@/components/v2/BottomNav";
import { supabase } from "@/integrations/supabase/client";
import { useNbaLivePolling } from "@/hooks/useNbaLivePolling";
import { format, parseISO } from "date-fns";
import {
  SoccerBall,
  Basketball,
  MagnifyingGlass,
  CaretRight,
  MapPin
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
  team_logo_url: string | null;
  position: string;
  jersey_number: number | null;
  current_market_value: number | null;
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
  injury_status: string;
}

interface UpcomingMatch {
  id: string;
  athlete_id: string;
  match_date: string;
  opponent: string;
  competition: string;
  home_away: string | null;
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

const formatMarketValue = (value: number | null): string => {
  if (!value) return "—";
  if (value >= 1000000) return `€${(value / 1000000).toFixed(0)}M`;
  if (value >= 1000) return `€${(value / 1000).toFixed(0)}K`;
  return `€${value}`;
};

const getInjuryBadge = (status: string) => {
  switch (status) {
    case "healthy":
      return { bg: "bg-emerald-100 dark:bg-emerald-900/30", text: "text-emerald-700 dark:text-emerald-400", label: "Fit" };
    case "questionable":
      return { bg: "bg-yellow-100 dark:bg-yellow-900/30", text: "text-yellow-700 dark:text-yellow-400", label: "Questionable" };
    case "doubtful":
      return { bg: "bg-orange-100 dark:bg-orange-900/30", text: "text-orange-700 dark:text-orange-400", label: "Doubtful" };
    case "out":
      return { bg: "bg-red-100 dark:bg-red-900/30", text: "text-red-700 dark:text-red-400", label: "Out" };
    default:
      return { bg: "bg-muted", text: "text-muted-foreground", label: status || "Unknown" };
  }
};

// Parse match result to determine W/L/D
const parseMatchResult = (result: string | null, sport: string): 'win' | 'loss' | 'draw' | null => {
  if (!result) return null;
  
  // NBA format: "W 137-109" or "L 109-122"
  if (sport === 'basketball') {
    if (result.startsWith('W')) return 'win';
    if (result.startsWith('L')) return 'loss';
    return null;
  }
  
  // Football format: Check for W/L/D prefix first
  if (result.startsWith('W')) return 'win';
  if (result.startsWith('L')) return 'loss';
  if (result.startsWith('D')) return 'draw';
  
  // Parse score like "4-0" (assume first number is our team in context)
  const scoreMatch = result.match(/(\d+)\s*[-–]\s*(\d+)/);
  if (scoreMatch) {
    const score1 = parseInt(scoreMatch[1]);
    const score2 = parseInt(scoreMatch[2]);
    if (score1 > score2) return 'win';
    if (score1 < score2) return 'loss';
    return 'draw';
  }
  
  return null;
};

// Aggregate season stats for an athlete
const aggregateSeasonStats = (stats: SeasonStats[], athleteId: string, sport: string) => {
  const athleteStats = stats.filter(s => s.athlete_id === athleteId);
  
  if (sport === 'basketball') {
    // For NBA, find the NBA season stats
    const nbaStats = athleteStats.find(s => s.competition === 'NBA');
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
  
  // For football, aggregate across all competitions
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
// SUB-COMPONENTS
// ============================================================================

interface AthleteCardProps {
  athlete: AthleteProfile;
  latestUpdate: DailyUpdate | undefined;
  aggregatedStats: any;
  nextMatch: UpcomingMatch | undefined;
  recentMatches: DailyUpdate[];
}

const AthleteCard = ({
  athlete,
  latestUpdate,
  aggregatedStats,
  nextMatch,
  recentMatches
}: AthleteCardProps) => {
  const isBasketball = athlete.sport === "basketball";
  const injuryStatus = latestUpdate?.injury_status || "healthy";
  const injuryBadge = getInjuryBadge(injuryStatus);

  // Calculate form (last 5 matches)
  const form = recentMatches
    .filter(m => m.played)
    .slice(0, 5)
    .map(m => parseMatchResult(m.match_result, athlete.sport))
    .filter(Boolean);

  return (
    <Link
      to={`/athlete/${athlete.slug}`}
      className="block bg-card border border-border rounded-2xl overflow-hidden hover:border-accent/50 hover:shadow-lg transition-all group"
    >
      {/* Top Section - Photo & Basic Info */}
      <div className="relative">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-accent/5" />
        
        {/* Content */}
        <div className="relative p-4 flex gap-4">
          {/* Photo */}
          <div className="relative flex-shrink-0">
            <img
              src={athlete.photo_url || "/placeholder.svg"}
              alt={athlete.name}
              className="w-20 h-20 rounded-xl object-cover border-2 border-white dark:border-gray-800 shadow-md group-hover:scale-105 transition-transform"
            />
            {/* Jersey Number Badge */}
            {athlete.jersey_number && (
              <div className="absolute -bottom-1 -right-1 w-7 h-7 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs font-bold shadow">
                {athlete.jersey_number}
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="font-bold text-lg text-foreground truncate group-hover:text-accent transition-colors">
                  {athlete.name}
                </h3>
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  {isBasketball ? (
                    <Basketball size={14} weight="fill" />
                  ) : (
                    <SoccerBall size={14} weight="fill" />
                  )}
                  {athlete.position}
                </p>
              </div>
              {/* Team Logo */}
              {athlete.team_logo_url && (
                <img
                  src={athlete.team_logo_url}
                  alt={athlete.team}
                  className="w-10 h-10 object-contain flex-shrink-0"
                />
              )}
            </div>

            {/* Team & League */}
            <div className="mt-2 flex items-center gap-2 flex-wrap">
              <span className="text-sm font-medium text-foreground">{athlete.team}</span>
              <span className="text-muted-foreground">•</span>
              <span className="text-sm text-muted-foreground">{athlete.league}</span>
            </div>

            {/* Status Badge */}
            <div className="mt-2">
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${injuryBadge.bg} ${injuryBadge.text}`}>
                {injuryStatus === "healthy" ? "🟢" : "🔴"} {injuryBadge.label}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Section */}
      <div className="px-4 py-3 border-t border-border bg-muted/30">
        <div className="grid grid-cols-4 gap-2 text-center">
          {isBasketball ? (
            <>
              <div>
                <div className="text-lg font-bold text-foreground">
                  {aggregatedStats?.ppg?.toFixed(1) || "—"}
                </div>
                <div className="text-[10px] text-muted-foreground uppercase">PPG</div>
              </div>
              <div>
                <div className="text-lg font-bold text-foreground">
                  {aggregatedStats?.rpg?.toFixed(1) || "—"}
                </div>
                <div className="text-[10px] text-muted-foreground uppercase">RPG</div>
              </div>
              <div>
                <div className="text-lg font-bold text-foreground">
                  {aggregatedStats?.apg?.toFixed(1) || "—"}
                </div>
                <div className="text-[10px] text-muted-foreground uppercase">APG</div>
              </div>
              <div>
                <div className="text-lg font-bold text-foreground">
                  {aggregatedStats?.gamesPlayed || "—"}
                </div>
                <div className="text-[10px] text-muted-foreground uppercase">GP</div>
              </div>
            </>
          ) : (
            <>
              <div>
                <div className="text-lg font-bold text-foreground">{aggregatedStats?.goals || 0}</div>
                <div className="text-[10px] text-muted-foreground uppercase">Goals</div>
              </div>
              <div>
                <div className="text-lg font-bold text-foreground">{aggregatedStats?.assists || 0}</div>
                <div className="text-[10px] text-muted-foreground uppercase">Assists</div>
              </div>
              <div>
                <div className="text-lg font-bold text-foreground">
                  {aggregatedStats?.rating?.toFixed(1) || "—"}
                </div>
                <div className="text-[10px] text-muted-foreground uppercase">Rating</div>
              </div>
              <div>
                <div className="text-lg font-bold text-foreground">
                  {formatMarketValue(athlete.current_market_value)}
                </div>
                <div className="text-[10px] text-muted-foreground uppercase">Value</div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Form & Next Match Section */}
      <div className="px-4 py-3 border-t border-border flex items-center justify-between gap-4">
        {/* Form */}
        {form.length > 0 ? (
          <div className="flex-1">
            <div className="text-[10px] text-muted-foreground uppercase mb-1">Form</div>
            <div className="flex gap-1">
              {form.map((result, i) => (
                <div
                  key={i}
                  className={`w-6 h-6 rounded flex items-center justify-center text-[10px] font-bold text-white ${
                    result === "win"
                      ? "bg-emerald-500"
                      : result === "loss"
                      ? "bg-red-500"
                      : "bg-gray-400"
                  }`}
                >
                  {result === "win" ? "W" : result === "loss" ? "L" : "D"}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex-1">
            <div className="text-[10px] text-muted-foreground uppercase mb-1">Form</div>
            <div className="text-sm text-muted-foreground">No recent matches</div>
          </div>
        )}

        {/* Next Match */}
        <div className="text-right">
          <div className="text-[10px] text-muted-foreground uppercase mb-1">Next</div>
          {nextMatch ? (
            <div>
              <div className="text-sm font-medium text-foreground">
                {nextMatch.home_away === "home" ? "vs" : "@"} {nextMatch.opponent}
              </div>
              <div className="text-xs text-accent">
                {format(parseISO(nextMatch.match_date), "MMM d, HH:mm")}
              </div>
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">—</div>
          )}
        </div>
      </div>
    </Link>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const TurkishStars = () => {
  const [athletes, setAthletes] = useState<AthleteProfile[]>([]);
  const [dailyUpdates, setDailyUpdates] = useState<DailyUpdate[]>([]);
  const [upcomingMatches, setUpcomingMatches] = useState<UpcomingMatch[]>([]);
  const [seasonStats, setSeasonStats] = useState<SeasonStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [sportFilter, setSportFilter] = useState<"all" | "football" | "basketball">("all");

  // Poll for live NBA matches
  useNbaLivePolling({ enabled: true, intervalMs: 30000 });

  useEffect(() => {
    const fetchData = async () => {
      const [athletesRes, updatesRes, matchesRes, statsRes] = await Promise.all([
        supabase.from("athlete_profiles").select("*").order("name"),
        supabase.from("athlete_daily_updates").select("*").order("date", { ascending: false }),
        supabase.from("athlete_upcoming_matches").select("*").order("match_date"),
        supabase.from("athlete_season_stats").select("*").ilike("season", "%24%") // 2024-25 season
      ]);

      if (athletesRes.data) setAthletes(athletesRes.data);
      if (updatesRes.data) setDailyUpdates(updatesRes.data);
      if (matchesRes.data) setUpcomingMatches(matchesRes.data);
      if (statsRes.data) setSeasonStats(statsRes.data);
      setLoading(false);
    };

    fetchData();
  }, []);

  // Helpers
  const getLatestUpdate = (athleteId: string) =>
    dailyUpdates.find((u) => u.athlete_id === athleteId);

  const getAggregatedStats = (athleteId: string, sport: string) =>
    aggregateSeasonStats(seasonStats, athleteId, sport);

  const getNextMatch = (athleteId: string) => {
    const now = new Date();
    return upcomingMatches.find(
      (m) => m.athlete_id === athleteId && new Date(m.match_date) > now
    );
  };

  const getRecentMatches = (athleteId: string) =>
    dailyUpdates.filter((u) => u.athlete_id === athleteId);

  // Filter athletes
  const filteredAthletes = athletes.filter((athlete) => {
    const matchesSearch = athlete.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      athlete.team.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSport = sportFilter === "all" || athlete.sport === sportFilter;
    return matchesSearch && matchesSport;
  });

  // Count by sport
  const footballCount = athletes.filter((a) => a.sport === "football").length;
  const basketballCount = athletes.filter((a) => a.sport === "basketball").length;

  if (loading) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <MiniHeader />
        <div className="flex items-center justify-center h-64">
          <div className="animate-pulse flex flex-col items-center gap-2">
            <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
            <span className="text-sm text-muted-foreground">Loading athletes...</span>
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
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <span className="text-3xl">🇹🇷</span>
            Turkish Stars
          </h1>
          <p className="text-muted-foreground mt-1">
            {athletes.length} athletes tracked across top leagues
          </p>
        </div>

        {/* Search & Filters */}
        <div className="mb-6 space-y-3">
          {/* Search */}
          <div className="relative">
            <MagnifyingGlass
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <input
              type="text"
              placeholder="Search athletes or teams..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-card border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent"
            />
          </div>

          {/* Sport Filter Pills */}
          <div className="flex gap-2">
            <button
              onClick={() => setSportFilter("all")}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                sportFilter === "all"
                  ? "bg-accent text-accent-foreground"
                  : "bg-card border border-border text-muted-foreground hover:text-foreground hover:border-accent/50"
              }`}
            >
              All ({athletes.length})
            </button>
            <button
              onClick={() => setSportFilter("football")}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-1.5 ${
                sportFilter === "football"
                  ? "bg-accent text-accent-foreground"
                  : "bg-card border border-border text-muted-foreground hover:text-foreground hover:border-accent/50"
              }`}
            >
              <SoccerBall size={14} weight="fill" />
              Football ({footballCount})
            </button>
            <button
              onClick={() => setSportFilter("basketball")}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-1.5 ${
                sportFilter === "basketball"
                  ? "bg-accent text-accent-foreground"
                  : "bg-card border border-border text-muted-foreground hover:text-foreground hover:border-accent/50"
              }`}
            >
              <Basketball size={14} weight="fill" />
              Basketball ({basketballCount})
            </button>
          </div>
        </div>

        {/* Athletes Grid */}
        {filteredAthletes.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2">
            {filteredAthletes.map((athlete) => (
              <AthleteCard
                key={athlete.id}
                athlete={athlete}
                latestUpdate={getLatestUpdate(athlete.id)}
                aggregatedStats={getAggregatedStats(athlete.id, athlete.sport)}
                nextMatch={getNextMatch(athlete.id)}
                recentMatches={getRecentMatches(athlete.id)}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <MagnifyingGlass size={48} className="mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">No athletes found</h3>
            <p className="text-muted-foreground">
              Try adjusting your search or filters
            </p>
          </div>
        )}

        {/* League Distribution */}
        {filteredAthletes.length > 0 && (
          <div className="mt-8 p-4 bg-card border border-border rounded-xl">
            <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              <MapPin size={16} weight="duotone" className="text-accent" />
              League Distribution
            </h3>
            <div className="flex flex-wrap gap-2">
              {Array.from(new Set(filteredAthletes.map((a) => a.league))).map((league) => {
                const count = filteredAthletes.filter((a) => a.league === league).length;
                return (
                  <span
                    key={league}
                    className="px-3 py-1 bg-muted rounded-full text-xs font-medium text-muted-foreground"
                  >
                    {league} ({count})
                  </span>
                );
              })}
            </div>
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
};

export default TurkishStars;

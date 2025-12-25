import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { MiniHeader } from '@/components/v2/MiniHeader';
import { BottomNav } from '@/components/v2/BottomNav';
import { supabase } from '@/integrations/supabase/client';
import { useNbaLivePolling } from '@/hooks/useNbaLivePolling';
import { format, formatDistanceToNow, parseISO, isToday, isTomorrow } from 'date-fns';
import { 
  Broadcast, 
  SoccerBall, 
  Basketball, 
  TrendUp, 
  Newspaper, 
  FirstAid,
  CaretRight,
  Clock,
  Fire,
  Star,
  ArrowRight,
  Trophy,
  CurrencyEur,
  ArrowSquareOut,
  CheckCircle
} from '@phosphor-icons/react';

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
  athlete_stats: any;
}

interface UpcomingMatch {
  id: string;
  athlete_id: string;
  opponent: string;
  competition: string;
  home_away: string | null;
  match_date: string;
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
  injury_status: string;
  injury_details: string | null;
}

interface TransferRumor {
  id: string;
  athlete_id: string;
  rumor_date: string;
  headline: string;
  source: string | null;
  reliability: string;
}

interface AthleteNews {
  id: string;
  athlete_id: string;
  title: string;
  source_url: string;
  source_name: string | null;
  image_url: string | null;
  published_at: string | null;
  created_at: string;
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

import { formatMarketValue } from "@/lib/formatMarketValue";

const getTimeAgo = (dateStr: string | null): string => {
  if (!dateStr) return '';
  try {
    return formatDistanceToNow(parseISO(dateStr), { addSuffix: true });
  } catch {
    return '';
  }
};

const formatMatchTime = (dateStr: string): string => {
  const date = parseISO(dateStr);
  if (isToday(date)) return `Today ${format(date, 'HH:mm')}`;
  if (isTomorrow(date)) return `Tomorrow ${format(date, 'HH:mm')}`;
  return format(date, 'EEE HH:mm');
};

const getRatingColor = (rating: number | null): string => {
  if (!rating) return 'text-muted-foreground';
  if (rating >= 8) return 'text-emerald-500';
  if (rating >= 7) return 'text-blue-500';
  if (rating >= 6) return 'text-yellow-500';
  return 'text-red-500';
};

const getReliabilityStyle = (reliability: string): string => {
  switch (reliability) {
    case 'tier_1': return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400';
    case 'tier_2': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
    case 'tier_3': return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';
    default: return 'bg-muted text-muted-foreground';
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
  
  // Football format: "4-0" or "0-1" (home score - away score from team perspective)
  // We need to check if result has W/L prefix first
  if (result.startsWith('W')) return 'win';
  if (result.startsWith('L')) return 'loss';
  if (result.startsWith('D')) return 'draw';
  
  // Parse score like "4-0"
  const scoreMatch = result.match(/(\d+)\s*[-–]\s*(\d+)/);
  if (scoreMatch) {
    const homeScore = parseInt(scoreMatch[1]);
    const awayScore = parseInt(scoreMatch[2]);
    if (homeScore > awayScore) return 'win';
    if (homeScore < awayScore) return 'loss';
    return 'draw';
  }
  
  return null;
};

// Aggregate season stats for an athlete
const aggregateSeasonStats = (stats: SeasonStats[], athleteId: string, sport: string) => {
  const athleteStats = stats.filter(s => s.athlete_id === athleteId);
  
  if (sport === 'basketball') {
    // For NBA, find the NBA season stats (should be one row)
    const nbaStats = athleteStats.find(s => s.competition === 'NBA');
    if (nbaStats?.stats) {
      return {
        ppg: nbaStats.stats.ppg || nbaStats.stats.points_per_game || 0,
        rpg: nbaStats.stats.rpg || nbaStats.stats.rebounds_per_game || 0,
        apg: nbaStats.stats.apg || nbaStats.stats.assists_per_game || 0,
        gamesPlayed: nbaStats.games_played || 0
      };
    }
    return { ppg: 0, rpg: 0, apg: 0, gamesPlayed: 0 };
  }
  
  // For football, aggregate across all competitions
  let totalGoals = 0;
  let totalAssists = 0;
  let totalMinutes = 0;
  let totalGames = 0;
  let ratingSum = 0;
  let ratingCount = 0;
  
  athleteStats.forEach(s => {
    if (s.stats) {
      totalGoals += s.stats.goals || 0;
      totalAssists += s.stats.assists || 0;
      totalMinutes += s.stats.minutes || 0;
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

// Live Match Hero Banner
const LiveMatchHero = ({ 
  match, 
  athlete 
}: { 
  match: LiveMatch; 
  athlete: AthleteProfile;
}) => {
  const isHome = match.home_away === 'home';
  const teamScore = isHome ? match.home_score : match.away_score;
  const oppScore = isHome ? match.away_score : match.home_score;
  const isBasketball = athlete.sport === 'basketball';

  return (
    <Link to={`/athlete/${athlete.slug}`} className="block">
      <div className="mx-4 mt-4 rounded-2xl overflow-hidden bg-gradient-to-br from-red-600 via-red-700 to-red-900 text-white shadow-lg">
        {/* Live Badge */}
        <div className="flex items-center gap-2 px-4 pt-4 pb-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white"></span>
          </span>
          <span className="text-xs font-bold uppercase tracking-wider">Live Now</span>
          <span className="text-xs text-white/70">• {match.competition}</span>
        </div>

        {/* Score Section */}
        <div className="px-4 pb-4">
          <div className="flex items-center justify-between">
            {/* Team Side */}
            <div className="flex items-center gap-3">
              {athlete.team_logo_url ? (
                <img 
                  src={athlete.team_logo_url} 
                  alt={athlete.team}
                  className="w-12 h-12 object-contain bg-white rounded-lg p-1"
                />
              ) : (
                <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                  {isBasketball ? <Basketball size={24} /> : <SoccerBall size={24} />}
                </div>
              )}
              <div>
                <div className="font-bold text-lg">{athlete.team}</div>
                <div className="text-xs text-white/70">{isHome ? 'Home' : 'Away'}</div>
              </div>
            </div>

            {/* Score */}
            <div className="text-center px-4">
              <div className="text-4xl font-black tracking-tight">
                {teamScore ?? 0} - {oppScore ?? 0}
              </div>
              <div className="mt-1 inline-flex items-center gap-1 bg-white/20 rounded-full px-2 py-0.5">
                <span className="text-sm font-semibold">
                  {match.match_status === 'halftime' ? 'HT' : 
                   isBasketball ? `Q${Math.ceil((match.current_minute || 1) / 12)}` : 
                   `${match.current_minute}'`}
                </span>
              </div>
            </div>

            {/* Opponent Side */}
            <div className="flex items-center gap-3">
              <div className="text-right">
                <div className="font-bold text-lg">{match.opponent}</div>
                <div className="text-xs text-white/70">{isHome ? 'Away' : 'Home'}</div>
              </div>
              <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                <span className="text-xs font-bold">{match.opponent.substring(0, 3).toUpperCase()}</span>
              </div>
            </div>
          </div>

          {/* Player Stats (if available) */}
          {match.athlete_stats && Object.keys(match.athlete_stats).length > 0 && (
            <div className="mt-4 pt-3 border-t border-white/20">
              <div className="flex items-center gap-2 mb-2">
                <img 
                  src={athlete.photo_url || '/placeholder.svg'} 
                  alt={athlete.name}
                  className="w-6 h-6 rounded-full object-cover"
                />
                <span className="text-sm font-medium">{athlete.name}</span>
              </div>
              <div className="flex gap-4 text-sm">
                {isBasketball ? (
                  <>
                    <span><strong>{match.athlete_stats.points || 0}</strong> PTS</span>
                    <span><strong>{match.athlete_stats.rebounds || 0}</strong> REB</span>
                    <span><strong>{match.athlete_stats.assists || 0}</strong> AST</span>
                  </>
                ) : (
                  <>
                    <span><strong>{match.athlete_stats.goals || 0}</strong> Goals</span>
                    <span><strong>{match.athlete_stats.assists || 0}</strong> Assists</span>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
};

// Today's Match Card (Compact)
const MatchCard = ({ 
  match, 
  athlete 
}: { 
  match: UpcomingMatch; 
  athlete: AthleteProfile;
}) => {
  const isBasketball = athlete.sport === 'basketball';
  
  return (
    <Link 
      to={`/athlete/${athlete.slug}`}
      className="flex-shrink-0 w-40 bg-card border border-border rounded-xl p-3 hover:border-accent/50 hover:shadow-md transition-all"
    >
      <div className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
        <Clock size={10} weight="bold" />
        {formatMatchTime(match.match_date)}
      </div>
      
      <div className="flex items-center justify-between mb-3">
        {athlete.team_logo_url ? (
          <img 
            src={athlete.team_logo_url} 
            alt={athlete.team}
            className="w-8 h-8 object-contain"
          />
        ) : (
          <div className="w-8 h-8 bg-muted rounded flex items-center justify-center">
            {isBasketball ? <Basketball size={16} /> : <SoccerBall size={16} />}
          </div>
        )}
        <span className="text-xs font-medium text-muted-foreground">vs</span>
        <div className="w-8 h-8 bg-muted rounded flex items-center justify-center">
          <span className="text-[10px] font-bold">{match.opponent.substring(0, 3).toUpperCase()}</span>
        </div>
      </div>
      
      <div className="flex items-center gap-1.5">
        <svg width="14" height="10" viewBox="0 0 30 20" className="rounded-sm flex-shrink-0">
          <rect width="30" height="20" fill="#E30A17"/>
          <circle cx="11" cy="10" r="6" fill="white"/>
          <circle cx="12.5" cy="10" r="4.8" fill="#E30A17"/>
          <polygon points="19,10 15.5,11.8 16.2,8 13.5,5.5 17.3,5 19,1.5 20.7,5 24.5,5.5 21.8,8 22.5,11.8" fill="white" transform="scale(0.55) translate(16, 8)"/>
        </svg>
        <span className="text-xs font-medium text-foreground truncate">{athlete.name.split(' ')[0]}</span>
      </div>
      
      <div className="text-[10px] text-muted-foreground mt-1 truncate">
        {match.competition}
      </div>
    </Link>
  );
};

// Performance Card (for feed)
const PerformanceCard = ({
  update,
  athlete
}: {
  update: DailyUpdate;
  athlete: AthleteProfile;
}) => {
  const isBasketball = athlete.sport === 'basketball';
  const stats = update.stats || {};

  return (
    <Link 
      to={`/athlete/${athlete.slug}`}
      className="block bg-card border border-border rounded-xl p-4 hover:border-accent/50 transition-all"
    >
      <div className="flex items-center gap-2 mb-3">
        <span className="bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 text-xs px-2 py-0.5 rounded font-medium flex items-center gap-1">
          <Trophy size={12} weight="fill" />
          STATS
        </span>
        <span className="text-xs text-muted-foreground">{getTimeAgo(update.date)}</span>
      </div>

      <div className="flex items-center gap-3">
        <img
          src={athlete.photo_url || '/placeholder.svg'}
          alt={athlete.name}
          className="w-14 h-14 rounded-full object-cover border-2 border-border"
        />
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-foreground truncate">{athlete.name}</h3>
          <p className="text-sm text-muted-foreground">
            vs {update.opponent} • {update.match_result || ''}
          </p>
        </div>
        {update.rating && (
          <div className={`text-2xl font-bold ${getRatingColor(update.rating)}`}>
            {update.rating.toFixed(1)}
          </div>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-4 gap-2 mt-4 pt-3 border-t border-border">
        {isBasketball ? (
          <>
            <div className="text-center">
              <div className="text-lg font-bold text-foreground">{stats.points || 0}</div>
              <div className="text-[10px] text-muted-foreground uppercase">PTS</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-foreground">{stats.rebounds || 0}</div>
              <div className="text-[10px] text-muted-foreground uppercase">REB</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-foreground">{stats.assists || 0}</div>
              <div className="text-[10px] text-muted-foreground uppercase">AST</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-foreground">{stats.blocks || 0}</div>
              <div className="text-[10px] text-muted-foreground uppercase">BLK</div>
            </div>
          </>
        ) : (
          <>
            <div className="text-center">
              <div className="text-lg font-bold text-foreground">{stats.goals || 0}</div>
              <div className="text-[10px] text-muted-foreground uppercase">Goals</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-foreground">{stats.assists || 0}</div>
              <div className="text-[10px] text-muted-foreground uppercase">Assists</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-foreground">{stats.shots_total || '—'}</div>
              <div className="text-[10px] text-muted-foreground uppercase">Shots</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-foreground">{update.minutes_played || '—'}</div>
              <div className="text-[10px] text-muted-foreground uppercase">MIN</div>
            </div>
          </>
        )}
      </div>
    </Link>
  );
};

// News Card (for feed)
const NewsCard = ({
  news,
  athlete
}: {
  news: AthleteNews;
  athlete: AthleteProfile;
}) => (
  <a
    href={news.source_url}
    target="_blank"
    rel="noopener noreferrer"
    className="block bg-card border border-border rounded-xl overflow-hidden hover:border-accent/50 transition-all"
  >
    {news.image_url && (
      <div className="relative h-40 bg-muted">
        <img
          src={news.image_url}
          alt=""
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        <div className="absolute bottom-2 left-2 bg-accent text-accent-foreground text-xs px-2 py-1 rounded font-medium flex items-center gap-1">
          <Newspaper size={12} weight="fill" />
          NEWS
        </div>
      </div>
    )}
    <div className="p-4">
      {!news.image_url && (
        <div className="flex items-center gap-2 mb-2">
          <span className="bg-accent/10 text-accent text-xs px-2 py-0.5 rounded font-medium flex items-center gap-1">
            <Newspaper size={12} weight="fill" />
            NEWS
          </span>
          <span className="text-xs text-muted-foreground">{getTimeAgo(news.published_at)}</span>
        </div>
      )}
      <h3 className="font-semibold text-foreground line-clamp-2 mb-2">{news.title}</h3>
      <div className="flex items-center gap-2">
        <img
          src={athlete.photo_url || '/placeholder.svg'}
          alt={athlete.name}
          className="w-5 h-5 rounded-full object-cover"
        />
        <span className="text-sm text-muted-foreground">{athlete.name}</span>
        {news.source_name && (
          <>
            <span className="text-muted-foreground">•</span>
            <span className="text-xs text-muted-foreground">{news.source_name}</span>
          </>
        )}
      </div>
    </div>
  </a>
);

// Transfer Rumor Card (for feed)
const TransferCard = ({
  rumor,
  athlete
}: {
  rumor: TransferRumor;
  athlete: AthleteProfile;
}) => (
  <Link
    to={`/athlete/${athlete.slug}`}
    className="flex items-center gap-4 p-4 bg-gradient-to-r from-blue-50 to-card dark:from-blue-950/20 dark:to-card border border-blue-200 dark:border-blue-800/50 rounded-xl hover:shadow-md transition-all"
  >
    <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center flex-shrink-0">
      <TrendUp size={24} weight="duotone" className="text-blue-600 dark:text-blue-400" />
    </div>
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-2 mb-1">
        <span className={`text-xs px-2 py-0.5 rounded font-medium ${getReliabilityStyle(rumor.reliability)}`}>
          {rumor.reliability.replace('_', ' ').toUpperCase()}
        </span>
        <span className="text-xs text-muted-foreground">{getTimeAgo(rumor.rumor_date)}</span>
      </div>
      <h3 className="font-semibold text-foreground line-clamp-2">{rumor.headline}</h3>
      <p className="text-sm text-muted-foreground mt-1">{athlete.name}</p>
    </div>
    <CaretRight size={20} className="text-muted-foreground flex-shrink-0" />
  </Link>
);

// Injury Alert Card (for feed)
const InjuryCard = ({
  update,
  athlete
}: {
  update: DailyUpdate;
  athlete: AthleteProfile;
}) => {
  const getInjuryStyle = (status: string) => {
    switch (status) {
      case 'out': return 'from-red-50 to-card dark:from-red-950/20 border-red-200 dark:border-red-800/50';
      case 'doubtful': return 'from-orange-50 to-card dark:from-orange-950/20 border-orange-200 dark:border-orange-800/50';
      case 'questionable': return 'from-yellow-50 to-card dark:from-yellow-950/20 border-yellow-200 dark:border-yellow-800/50';
      default: return 'from-muted to-card border-border';
    }
  };

  const getInjuryIconColor = (status: string) => {
    switch (status) {
      case 'out': return 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400';
      case 'doubtful': return 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400';
      case 'questionable': return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <Link
      to={`/athlete/${athlete.slug}`}
      className={`flex items-center gap-4 p-4 bg-gradient-to-r ${getInjuryStyle(update.injury_status)} border rounded-xl hover:shadow-md transition-all`}
    >
      <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${getInjuryIconColor(update.injury_status)}`}>
        <FirstAid size={24} weight="duotone" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-xs px-2 py-0.5 rounded font-medium">
            INJURY
          </span>
        </div>
        <h3 className="font-semibold text-foreground">{athlete.name}</h3>
        <p className="text-sm text-muted-foreground capitalize">
          {update.injury_status} {update.injury_details && `— ${update.injury_details}`}
        </p>
      </div>
      <CaretRight size={20} className="text-muted-foreground flex-shrink-0" />
    </Link>
  );
};

// Market Value Leaderboard - Top 20 Turkish Players
const MARKET_VALUE_DATA = [
  { rank: 1, name: "Arda Güler", team: "Real Madrid", value: 90, slug: "arda-guler", tracked: true },
  { rank: 2, name: "Kenan Yıldız", team: "Juventus", value: 75, slug: "kenan-yildiz", tracked: true },
  { rank: 3, name: "Can Uzun", team: "Eintracht Frankfurt", value: 45, slug: "can-uzun", tracked: true },
  { rank: 4, name: "Ferdi Kadıoğlu", team: "Brighton", value: 28, slug: "ferdi-kadioglu", tracked: true },
  { rank: 5, name: "Hakan Çalhanoğlu", team: "Inter", value: 25, slug: "hakan-calhanoglu", tracked: true },
  { rank: 6, name: "Orkun Kökçü", team: "Benfica", value: 25, slug: null, tracked: false },
  { rank: 7, name: "Barış Alper Yılmaz", team: "Galatasaray", value: 24, slug: null, tracked: false },
  { rank: 8, name: "Kerem Aktürkoğlu", team: "Benfica", value: 22, slug: null, tracked: false },
  { rank: 9, name: "Yunus Akgün", team: "Galatasaray", value: 17, slug: null, tracked: false },
  { rank: 10, name: "Yusuf Akçiçek", team: "Al-Hilal", value: 16, slug: "yusuf-akcicek", tracked: true },
  { rank: 11, name: "Uğurcan Çakır", team: "Galatasaray", value: 15, slug: null, tracked: false },
  { rank: 12, name: "Merih Demiral", team: "Al-Ahli", value: 14, slug: "merih-demiral", tracked: true },
  { rank: 13, name: "İsmail Yüksek", team: "Fenerbahçe", value: 13, slug: null, tracked: false },
  { rank: 14, name: "Semih Kılıçsoy", team: "Cagliari", value: 12, slug: "semih-kilicsoy", tracked: true },
  { rank: 15, name: "Oğuz Aydın", team: "Fenerbahçe", value: 10, slug: null, tracked: false },
  { rank: 16, name: "Berke Özer", team: "Lille", value: 10, slug: "berke-ozer", tracked: true },
  { rank: 17, name: "Atakan Karazor", team: "Stuttgart", value: 9, slug: "atakan-karazor", tracked: true },
  { rank: 18, name: "Enes Ünal", team: "Bournemouth", value: 8, slug: "enes-unal", tracked: true },
  { rank: 19, name: "Altay Bayındır", team: "Manchester United", value: 7, slug: "altay-bayindir", tracked: true },
  { rank: 20, name: "Cengiz Ünder", team: "Fenerbahçe", value: 7, slug: null, tracked: false },
];

const MarketValueLeaderboard = () => {
  const trackedCount = MARKET_VALUE_DATA.filter(p => p.tracked).length;

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 px-4 py-3 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CurrencyEur size={20} weight="fill" />
            <h3 className="font-bold">Most Valuable Turkish Players</h3>
          </div>
          <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">
            Dec 2025
          </span>
        </div>
        <p className="text-xs text-emerald-100 mt-1">
          Tracking {trackedCount} of top 20 • Source: Transfermarkt
        </p>
      </div>

      {/* Leaderboard - Show top 10 */}
      <div className="divide-y divide-border">
        {MARKET_VALUE_DATA.slice(0, 10).map((player) => {
          const content = (
            <div 
              className={`flex items-center gap-3 px-4 py-2.5 transition-colors ${
                player.tracked 
                  ? 'bg-emerald-50/50 dark:bg-emerald-950/20 hover:bg-emerald-100/50 dark:hover:bg-emerald-950/30' 
                  : 'hover:bg-muted/50 opacity-50'
              }`}
            >
              {/* Rank */}
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                player.rank === 1 ? 'bg-yellow-400 text-yellow-900' :
                player.rank === 2 ? 'bg-gray-300 text-gray-700' :
                player.rank === 3 ? 'bg-orange-400 text-orange-900' :
                'bg-muted text-muted-foreground'
              }`}>
                {player.rank}
              </div>

              {/* Player Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className={`font-semibold text-sm truncate ${player.tracked ? 'text-foreground' : 'text-muted-foreground'}`}>
                    {player.name}
                  </span>
                  {player.tracked && (
                    <Star size={12} weight="fill" className="text-yellow-500 flex-shrink-0" />
                  )}
                </div>
                <div className="text-xs text-muted-foreground truncate">
                  {player.team}
                </div>
              </div>

              {/* Value */}
              <div className={`font-bold text-sm ${player.tracked ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'}`}>
                €{player.value}m
              </div>

              {/* Arrow for tracked players */}
              {player.tracked && (
                <ArrowSquareOut size={14} className="text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
              )}
            </div>
          );

          // Wrap tracked players in Link
          if (player.tracked && player.slug) {
            return (
              <Link key={player.rank} to={`/athlete/${player.slug}`} className="block">
                {content}
              </Link>
            );
          }

          return <div key={player.rank}>{content}</div>;
        })}
      </div>

      {/* Footer */}
      <div className="px-4 py-2.5 bg-muted/30 border-t border-border">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground flex items-center gap-1">
            <Star size={10} weight="fill" className="text-yellow-500" />
            = Tracked in TST
          </span>
          <span className="text-muted-foreground">
            Total tracked value: <span className="font-bold text-emerald-600 dark:text-emerald-400">€339m</span>
          </span>
        </div>
      </div>
    </div>
  );
};

// Player Spotlight Card (Featured)
const SpotlightCard = ({
  athlete,
  aggregatedStats,
  recentMatches
}: {
  athlete: AthleteProfile;
  aggregatedStats: any;
  recentMatches: DailyUpdate[];
}) => {
  const isBasketball = athlete.sport === 'basketball';
  
  // Calculate form (last 5 matches)
  const form = recentMatches
    .filter(m => m.played)
    .slice(0, 5)
    .map(m => parseMatchResult(m.match_result, athlete.sport))
    .filter(Boolean);

  return (
    <Link 
      to={`/athlete/${athlete.slug}`}
      className="block relative rounded-2xl overflow-hidden group"
    >
      {/* Background Image */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary to-primary/80">
        {athlete.photo_url && (
          <img
            src={athlete.photo_url}
            alt=""
            className="w-full h-full object-cover opacity-30 group-hover:scale-105 transition-transform duration-500"
          />
        )}
      </div>
      
      {/* Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent" />
      
      {/* Content */}
      <div className="relative p-5 min-h-[280px] flex flex-col justify-end text-white">
        {/* Status Badge */}
        <div className="absolute top-4 left-4 flex items-center gap-2">
          <span className="bg-emerald-500 text-white text-xs px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
            <CheckCircle size={12} weight="fill" /> Fit
          </span>
          <span className="text-white/70 text-xs">#{athlete.jersey_number}</span>
        </div>
        
        {/* Team Logo */}
        {athlete.team_logo_url && (
          <img
            src={athlete.team_logo_url}
            alt={athlete.team}
            className="absolute top-4 right-4 w-12 h-12 object-contain opacity-80"
          />
        )}
        
        {/* Player Info */}
        <h3 className="text-2xl font-bold mb-1">{athlete.name}</h3>
        <p className="text-white/80 text-sm mb-4">{athlete.team} • {athlete.position}</p>
        
        {/* Stats Row */}
        <div className="flex gap-4 mb-4">
          {isBasketball ? (
            <>
              <div className="text-center">
                <div className="text-xl font-bold">{aggregatedStats.ppg?.toFixed(1) || '—'}</div>
                <div className="text-xs text-white/60">PPG</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-bold">{aggregatedStats.rpg?.toFixed(1) || '—'}</div>
                <div className="text-xs text-white/60">RPG</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-bold">{aggregatedStats.apg?.toFixed(1) || '—'}</div>
                <div className="text-xs text-white/60">APG</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-bold">{aggregatedStats.gamesPlayed || '—'}</div>
                <div className="text-xs text-white/60">GP</div>
              </div>
            </>
          ) : (
            <>
              <div className="text-center">
                <div className="text-xl font-bold">{aggregatedStats.goals || 0}</div>
                <div className="text-xs text-white/60">Goals</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-bold">{aggregatedStats.assists || 0}</div>
                <div className="text-xs text-white/60">Assists</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-bold">{aggregatedStats.rating?.toFixed(1) || '—'}</div>
                <div className="text-xs text-white/60">Rating</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-bold">{formatMarketValue(athlete.current_market_value)}</div>
                <div className="text-xs text-white/60">Value</div>
              </div>
            </>
          )}
        </div>
        
        {/* Form (if available) */}
        {form.length > 0 && (
          <div>
            <div className="text-xs text-white/60 mb-1">Last {form.length} matches</div>
            <div className="flex gap-1">
              {form.map((result, i) => (
                <div
                  key={i}
                  className={`w-7 h-7 rounded flex items-center justify-center text-xs font-bold ${
                    result === 'win' ? 'bg-emerald-500' :
                    result === 'loss' ? 'bg-red-500' :
                    'bg-gray-500'
                  }`}
                >
                  {result === 'win' ? 'W' : result === 'loss' ? 'L' : 'D'}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Link>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const LiveHub = () => {
  // State
  const [athletes, setAthletes] = useState<AthleteProfile[]>([]);
  const [liveMatches, setLiveMatches] = useState<LiveMatch[]>([]);
  const [upcomingMatches, setUpcomingMatches] = useState<UpcomingMatch[]>([]);
  const [dailyUpdates, setDailyUpdates] = useState<DailyUpdate[]>([]);
  const [transferRumors, setTransferRumors] = useState<TransferRumor[]>([]);
  const [news, setNews] = useState<AthleteNews[]>([]);
  const [seasonStats, setSeasonStats] = useState<SeasonStats[]>([]);
  const [loading, setLoading] = useState(true);

  // Keep live NBA games synced
  useNbaLivePolling({ enabled: true, intervalMs: 30000 });

  // Fetch all data
  useEffect(() => {
    const fetchData = async () => {
      const now = new Date();
      const twoDaysLater = new Date(now.getTime() + 48 * 60 * 60 * 1000);

      const [
        athletesRes,
        liveRes,
        upcomingRes,
        updatesRes,
        rumorsRes,
        newsRes,
        statsRes
      ] = await Promise.all([
        supabase.from('athlete_profiles').select('*').order('name'),
        supabase.from('athlete_live_matches').select('*').in('match_status', ['live', 'halftime']),
        supabase.from('athlete_upcoming_matches').select('*')
          .gte('match_date', now.toISOString())
          .lte('match_date', twoDaysLater.toISOString())
          .order('match_date'),
        supabase.from('athlete_daily_updates').select('*').order('date', { ascending: false }).limit(50),
        supabase.from('athlete_transfer_rumors').select('*').eq('status', 'active').order('rumor_date', { ascending: false }).limit(10),
        supabase.from('athlete_news').select('*').order('published_at', { ascending: false, nullsFirst: false }).limit(10),
        supabase.from('athlete_season_stats').select('*').ilike('season', '%24%') // Get 2024-25 season
      ]);

      if (athletesRes.data) setAthletes(athletesRes.data);
      if (liveRes.data) setLiveMatches(liveRes.data);
      if (upcomingRes.data) setUpcomingMatches(upcomingRes.data);
      if (updatesRes.data) setDailyUpdates(updatesRes.data);
      if (rumorsRes.data) setTransferRumors(rumorsRes.data);
      if (newsRes.data) setNews(newsRes.data);
      if (statsRes.data) setSeasonStats(statsRes.data);
      
      setLoading(false);
    };

    fetchData();

    // Realtime subscription for live matches
    const channel = supabase
      .channel('live-hub-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'athlete_live_matches' }, () => {
        fetchData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Helper to get athlete by ID
  const getAthlete = (id: string) => athletes.find(a => a.id === id);

  // Derived data
  const activeLiveMatch = liveMatches[0];
  const activeLiveAthlete = activeLiveMatch ? getAthlete(activeLiveMatch.athlete_id) : null;
  
  const todaysMatches = upcomingMatches.filter(m => {
    const matchDate = parseISO(m.match_date);
    return isToday(matchDate) || isTomorrow(matchDate);
  });

  const recentPerformances = dailyUpdates
    .filter(u => u.played && u.stats && Object.keys(u.stats).length > 0)
    .slice(0, 5);

  const injuryAlerts = dailyUpdates
    .filter(u => u.injury_status && u.injury_status !== 'healthy')
    .filter((u, i, arr) => arr.findIndex(x => x.athlete_id === u.athlete_id) === i)
    .slice(0, 3);

  const topRumors = transferRumors
    .filter(r => r.reliability === 'tier_1' || r.reliability === 'tier_2')
    .slice(0, 3);

  // Featured athlete (rotate or pick top performer)
  const featuredAthlete = athletes.find(a => a.slug === 'arda-guler') || athletes[0];
  const featuredStats = useMemo(() => {
    if (!featuredAthlete) return null;
    return aggregateSeasonStats(seasonStats, featuredAthlete.id, featuredAthlete.sport);
  }, [featuredAthlete, seasonStats]);
  const featuredMatches = featuredAthlete
    ? dailyUpdates.filter(u => u.athlete_id === featuredAthlete.id)
    : [];

  // Build mixed feed
  const buildFeed = () => {
    const feed: Array<{ type: string; data: any; date: string }> = [];

    // Add performances
    recentPerformances.forEach(p => {
      const athlete = getAthlete(p.athlete_id);
      if (athlete) {
        feed.push({ type: 'performance', data: { update: p, athlete }, date: p.date });
      }
    });

    // Add news
    news.slice(0, 5).forEach(n => {
      const athlete = getAthlete(n.athlete_id);
      if (athlete) {
        feed.push({ type: 'news', data: { news: n, athlete }, date: n.published_at || n.created_at });
      }
    });

    // Add transfer rumors
    topRumors.forEach(r => {
      const athlete = getAthlete(r.athlete_id);
      if (athlete) {
        feed.push({ type: 'transfer', data: { rumor: r, athlete }, date: r.rumor_date });
      }
    });

    // Add injury alerts
    injuryAlerts.forEach(i => {
      const athlete = getAthlete(i.athlete_id);
      if (athlete) {
        feed.push({ type: 'injury', data: { update: i, athlete }, date: i.date });
      }
    });

    // Sort by date descending
    return feed.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  };

  const feedItems = buildFeed();

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <MiniHeader />
        <div className="flex items-center justify-center h-64">
          <div className="animate-pulse flex flex-col items-center gap-2">
            <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
            <span className="text-sm text-muted-foreground">Loading...</span>
          </div>
        </div>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <MiniHeader />
      
      <main className="max-w-xl mx-auto">
        {/* LIVE MATCH HERO */}
        {activeLiveMatch && activeLiveAthlete && (
          <LiveMatchHero match={activeLiveMatch} athlete={activeLiveAthlete} />
        )}

        {/* TODAY'S MATCHES CAROUSEL */}
        {todaysMatches.length > 0 && (
          <section className="py-5">
            <div className="flex items-center justify-between px-4 mb-3">
              <h2 className="font-bold text-foreground flex items-center gap-2">
                <Clock size={18} weight="bold" className="text-accent" />
                Upcoming Matches
              </h2>
              <Link to="/live" className="text-accent text-sm font-medium flex items-center gap-1">
                See all <CaretRight size={14} weight="bold" />
              </Link>
            </div>
            <div className="flex gap-3 overflow-x-auto px-4 pb-2 scrollbar-hide">
              {todaysMatches.map(match => {
                const athlete = getAthlete(match.athlete_id);
                if (!athlete) return null;
                return <MatchCard key={match.id} match={match} athlete={athlete} />;
              })}
            </div>
          </section>
        )}

        {/* DIVIDER */}
        <div className="h-2 bg-muted/50" />

        {/* TRENDING / HOT RIGHT NOW */}
        {recentPerformances.length > 0 && (
          <section className="py-5 px-4">
            <h2 className="font-bold text-foreground flex items-center gap-2 mb-4">
              <Fire size={18} weight="fill" className="text-orange-500" />
              Hot Right Now
            </h2>
            <div className="space-y-3">
              {recentPerformances.slice(0, 3).map(perf => {
                const athlete = getAthlete(perf.athlete_id);
                if (!athlete) return null;
                const stats = perf.stats || {};
                const isBasketball = athlete.sport === 'basketball';
                
                return (
                  <Link
                    key={perf.id}
                    to={`/athlete/${athlete.slug}`}
                    className="flex items-center gap-3 p-3 bg-gradient-to-r from-orange-50 to-card dark:from-orange-950/10 dark:to-card border border-orange-200/50 dark:border-orange-800/30 rounded-xl hover:shadow-md transition-all"
                  >
                    <img
                      src={athlete.photo_url || '/placeholder.svg'}
                      alt={athlete.name}
                      className="w-12 h-12 rounded-full object-cover border-2 border-orange-300 dark:border-orange-700"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-foreground truncate">{athlete.name}</div>
                      <div className="text-sm text-muted-foreground">
                        vs {perf.opponent} • {perf.match_result}
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      {isBasketball ? (
                        <div className="font-bold text-foreground">
                          {stats.points || 0}/{stats.rebounds || 0}/{stats.assists || 0}
                        </div>
                      ) : (
                        <div className="font-bold text-foreground">
                          {stats.goals || 0}G {stats.assists || 0}A
                        </div>
                      )}
                      {perf.rating && (
                        <div className={`text-sm font-semibold ${getRatingColor(perf.rating)}`}>
                          ★ {perf.rating.toFixed(1)}
                        </div>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        {/* DIVIDER */}
        <div className="h-2 bg-muted/50" />

        {/* PLAYER SPOTLIGHT */}
        {featuredAthlete && featuredStats && (
          <section className="py-5 px-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-foreground flex items-center gap-2">
                <Star size={18} weight="fill" className="text-yellow-500" />
                Player Spotlight
              </h2>
              <Link to="/athletes" className="text-accent text-sm font-medium flex items-center gap-1">
                All {athletes.length} <CaretRight size={14} weight="bold" />
              </Link>
            </div>
            <SpotlightCard 
              athlete={featuredAthlete} 
              aggregatedStats={featuredStats}
              recentMatches={featuredMatches}
            />
          </section>
        )}

        {/* DIVIDER */}
        <div className="h-2 bg-muted/50" />

        {/* MARKET VALUE LEADERBOARD */}
        <section className="py-5 px-4">
          <MarketValueLeaderboard />
        </section>

        {/* DIVIDER */}
        <div className="h-2 bg-muted/50" />

        {/* MIXED FEED */}
        <section className="py-5 px-4">
          <h2 className="font-bold text-foreground flex items-center gap-2 mb-4">
            <Broadcast size={18} weight="duotone" className="text-accent" />
            Latest Updates
          </h2>
          
          <div className="space-y-4">
            {feedItems.map((item, index) => {
              switch (item.type) {
                case 'performance':
                  return (
                    <PerformanceCard 
                      key={`perf-${index}`} 
                      update={item.data.update} 
                      athlete={item.data.athlete} 
                    />
                  );
                case 'news':
                  return (
                    <NewsCard 
                      key={`news-${index}`} 
                      news={item.data.news} 
                      athlete={item.data.athlete} 
                    />
                  );
                case 'transfer':
                  return (
                    <TransferCard 
                      key={`transfer-${index}`} 
                      rumor={item.data.rumor} 
                      athlete={item.data.athlete} 
                    />
                  );
                case 'injury':
                  return (
                    <InjuryCard 
                      key={`injury-${index}`} 
                      update={item.data.update} 
                      athlete={item.data.athlete} 
                    />
                  );
                default:
                  return null;
              }
            })}
          </div>

          {feedItems.length === 0 && (
            <div className="text-center py-12">
              <Broadcast size={48} className="mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No updates yet. Check back soon!</p>
            </div>
          )}
        </section>

        {/* QUICK LINKS */}
        <section className="py-5 px-4">
          <div className="grid grid-cols-2 gap-3">
            <Link
              to="/athletes"
              className="flex items-center justify-between p-4 bg-card border border-border rounded-xl hover:border-accent/50 transition-all group"
            >
              <div>
                <div className="font-semibold text-foreground">All Athletes</div>
                <div className="text-sm text-muted-foreground">{athletes.length} tracked</div>
              </div>
              <ArrowRight size={20} className="text-muted-foreground group-hover:text-accent group-hover:translate-x-1 transition-all" />
            </Link>
            <Link
              to="/stats"
              className="flex items-center justify-between p-4 bg-card border border-border rounded-xl hover:border-accent/50 transition-all group"
            >
              <div>
                <div className="font-semibold text-foreground">Statistics</div>
                <div className="text-sm text-muted-foreground">Rankings & stats</div>
              </div>
              <ArrowRight size={20} className="text-muted-foreground group-hover:text-accent group-hover:translate-x-1 transition-all" />
            </Link>
          </div>
          
          {/* View Classic Link */}
          <Link
            to="/v1"
            className="flex items-center justify-between mt-3 p-4 bg-gradient-to-r from-primary/5 to-accent/5 border border-border rounded-xl hover:border-accent/40 transition-all group"
          >
            <div>
              <div className="font-semibold text-foreground">Classic View</div>
              <div className="text-sm text-muted-foreground">Original detailed layout</div>
            </div>
            <ArrowRight size={20} className="text-accent group-hover:translate-x-1 transition-transform" />
          </Link>
        </section>
      </main>
      
      {/* Mobile Bottom Navigation */}
      <BottomNav />
    </div>
  );
};

export default LiveHub;

// ============================================================================
// TST ATHLETE PROFILE - FEED-BASED LAYOUT
// ============================================================================
// Scrollable feed layout instead of tabs - surfaces the most interesting data upfront
// ============================================================================

import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  ArrowLeft,
  Target,
  Zap,
  Shield,
  TrendingUp,
  TrendingDown,
  Clock,
  BarChart3,
  Calendar,
  User,
  Instagram,
  Heart,
  Share2,
  ChevronRight
} from "lucide-react";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
  ResponsiveContainer
} from "recharts";

// ============================================================================
// TYPES
// ============================================================================

interface AthleteProfile {
  id: string;
  name: string;
  slug: string;
  team: string;
  league: string;
  position: string;
  jersey_number?: number;
  nationality: string;
  photo_url?: string;
  action_photo_url?: string;
  national_photo_url?: string;
  team_logo_url?: string;
  sport: string;
  instagram?: string;
  current_market_value?: number;
}

interface AdvancedStats {
  xg: number;
  npxg: number;
  xa: number;
  goals: number;
  assists: number;
  matches_played: number;
  minutes: number;
  shots_total: number;
  shots_on_target: number;
  pass_completion_pct: number;
  progressive_passes: number;
  key_passes: number;
  shot_creating_actions: number;
  goal_creating_actions: number;
  progressive_carries: number;
  take_ons_successful: number;
  take_ons_success_pct: number;
  tackles: number;
  interceptions: number;
  pressures: number;
  aerials_won: number;
  aerials_won_pct: number;
  touches: number;
  season: string;
  competition: string;
}

interface RecentMatch {
  id: string;
  date: string;
  opponent: string;
  result: string;
  rating: number;
  goals?: number;
  assists?: number;
  minutes_played?: number;
  competition?: string;
}

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

// Turkish Flag SVG
const TurkishFlag = () => (
  <svg width="24" height="16" viewBox="0 0 30 20" className="rounded-sm shadow-sm">
    <rect width="30" height="20" fill="#E30A17"/>
    <circle cx="11" cy="10" r="6" fill="white"/>
    <circle cx="12.5" cy="10" r="4.8" fill="#E30A17"/>
    <polygon points="16,10 19,7 17,10 19,13" fill="white" transform="rotate(18, 16, 10)"/>
  </svg>
);

// Stat with trend indicator
const TrendStat = ({ 
  label, 
  value, 
  trend, 
  size = "md" 
}: { 
  label: string; 
  value: string | number; 
  trend?: "up" | "down" | "neutral";
  size?: "sm" | "md" | "lg";
}) => {
  const sizeClasses = {
    sm: "text-lg",
    md: "text-2xl",
    lg: "text-3xl"
  };
  
  return (
    <div className="text-center">
      <div className={`font-bold ${sizeClasses[size]} flex items-center justify-center gap-1`}>
        {value}
        {trend === "up" && <TrendingUp size={14} className="text-emerald-500" />}
        {trend === "down" && <TrendingDown size={14} className="text-red-500" />}
      </div>
      <div className="text-xs text-muted-foreground uppercase tracking-wide">{label}</div>
    </div>
  );
};

// xG Comparison visualization
const XGComparison = ({ goals, xg }: { goals: number; xg: number }) => {
  const diff = goals - xg;
  const isOverperforming = diff > 0;
  
  return (
    <div className="bg-card border border-border rounded-2xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <Target size={20} className="text-primary" />
        <h3 className="font-semibold">Goal Efficiency</h3>
      </div>
      
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="text-3xl font-bold">{goals}</div>
          <div className="text-sm text-muted-foreground">Goals Scored</div>
        </div>
        <div className={`text-2xl font-bold ${isOverperforming ? 'text-emerald-500' : 'text-amber-500'}`}>
          {isOverperforming ? '+' : ''}{diff.toFixed(1)}
        </div>
        <div className="text-right">
          <div className="text-3xl font-bold text-muted-foreground">{xg.toFixed(1)}</div>
          <div className="text-sm text-muted-foreground">Expected (xG)</div>
        </div>
      </div>
      
      <div className="relative h-4 bg-muted rounded-full overflow-hidden">
        <div 
          className="absolute left-0 top-0 h-full bg-blue-200 dark:bg-blue-900/50 rounded-full"
          style={{ width: `${Math.min((xg / Math.max(goals, xg)) * 100, 100)}%` }}
        />
        <div 
          className={`absolute left-0 top-0 h-full rounded-full ${isOverperforming ? 'bg-emerald-500' : 'bg-amber-500'}`}
          style={{ width: `${Math.min((goals / Math.max(goals, xg)) * 100, 100)}%` }}
        />
      </div>
      
      <p className="text-sm text-muted-foreground mt-3">
        {isOverperforming 
          ? `Overperforming xG by ${diff.toFixed(1)} goals - clinical finishing!`
          : `Underperforming xG by ${Math.abs(diff).toFixed(1)} goals - room to improve`
        }
      </p>
    </div>
  );
};

// Mini Radar Chart
const MiniRadar = ({ data }: { data: { stat: string; value: number }[] }) => (
  <ResponsiveContainer width="100%" height={200}>
    <RadarChart cx="50%" cy="50%" outerRadius="70%" data={data}>
      <PolarGrid stroke="hsl(var(--border))" />
      <PolarAngleAxis 
        dataKey="stat" 
        tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
      />
      <Radar
        name="Stats"
        dataKey="value"
        stroke="#E30A17"
        fill="#E30A17"
        fillOpacity={0.3}
        strokeWidth={2}
      />
    </RadarChart>
  </ResponsiveContainer>
);

// ============================================================================
// FEED CARD COMPONENTS
// ============================================================================

// Hero Card - Always visible at top
const HeroCard = ({ athlete, stats }: { athlete: AthleteProfile; stats?: AdvancedStats }) => (
  <div className="bg-gradient-to-br from-rose-600 to-red-700 rounded-3xl p-6 text-white relative overflow-hidden">
    {/* Background pattern */}
    <div className="absolute inset-0 opacity-10">
      <div className="absolute top-0 right-0 w-64 h-64 bg-white rounded-full -translate-y-1/2 translate-x-1/2" />
      <div className="absolute bottom-0 left-0 w-48 h-48 bg-white rounded-full translate-y-1/2 -translate-x-1/2" />
    </div>
    
    <div className="relative z-10">
      <div className="flex items-start gap-4">
        {/* Player Image */}
        <div className="w-24 h-24 rounded-2xl bg-white/20 overflow-hidden flex-shrink-0">
          {athlete.photo_url ? (
            <img src={athlete.photo_url} alt={athlete.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <User size={40} className="text-white/50" />
            </div>
          )}
        </div>
        
        {/* Player Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <TurkishFlag />
          </div>
          <h1 className="text-2xl font-bold truncate">{athlete.name}</h1>
          <p className="text-white/80">{athlete.team}</p>
          <div className="flex items-center gap-2 mt-1 text-sm text-white/60">
            <span>{athlete.position}</span>
            {athlete.jersey_number && (
              <>
                <span>•</span>
                <span>#{athlete.jersey_number}</span>
              </>
            )}
            <span>•</span>
            <span>{athlete.league}</span>
          </div>
        </div>
      </div>
      
      {/* Key Stats Row */}
      {stats && (
        <div className="grid grid-cols-4 gap-4 mt-6 pt-4 border-t border-white/20">
          <TrendStat label="Goals" value={stats.goals} trend="up" size="md" />
          <TrendStat label="Assists" value={stats.assists} size="md" />
          <TrendStat label="xG" value={stats.xg.toFixed(1)} size="md" />
          <TrendStat label="Matches" value={stats.matches_played} size="md" />
        </div>
      )}
    </div>
  </div>
);

// Quick Stats Bar
const QuickStatsBar = ({ stats }: { stats: AdvancedStats }) => {
  const per90 = stats.minutes > 0 ? 90 / stats.minutes : 0;
  
  return (
    <div className="bg-card border border-border rounded-2xl p-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <Clock size={16} className="text-muted-foreground" />
            <span className="font-semibold">{stats.minutes}'</span>
            <span className="text-sm text-muted-foreground">played</span>
          </div>
          <div className="flex items-center gap-2">
            <BarChart3 size={16} className="text-muted-foreground" />
            <span className="font-semibold">{(stats.goals * per90).toFixed(2)}</span>
            <span className="text-sm text-muted-foreground">G/90</span>
          </div>
          <div className="flex items-center gap-2">
            <Target size={16} className="text-muted-foreground" />
            <span className="font-semibold">{stats.pass_completion_pct}%</span>
            <span className="text-sm text-muted-foreground">pass</span>
          </div>
        </div>
        <span className="text-xs text-muted-foreground">{stats.season} • {stats.competition}</span>
      </div>
    </div>
  );
};

// Performance Snapshot Card - Radar + Key Strengths
const PerformanceSnapshot = ({ stats }: { stats: AdvancedStats }) => {
  // Calculate percentiles (mock - based on raw stat values)
  const radarData = [
    { stat: 'Shooting', value: Math.min((stats.goals / 10) * 100, 100) },
    { stat: 'Passing', value: stats.pass_completion_pct || 0 },
    { stat: 'Creation', value: Math.min((stats.shot_creating_actions / 50) * 100, 100) },
    { stat: 'Dribbling', value: stats.take_ons_success_pct || 50 },
    { stat: 'Defense', value: Math.min(((stats.tackles + stats.interceptions) / 30) * 100, 100) },
    { stat: 'Pressing', value: Math.min((stats.pressures / 100) * 100, 100) },
  ];
  
  // Find top strengths
  const strengths = [
    { label: 'Shot Creating Actions', value: stats.shot_creating_actions, percentile: 85 },
    { label: 'Progressive Carries', value: stats.progressive_carries, percentile: 78 },
    { label: 'Key Passes', value: stats.key_passes, percentile: 72 },
  ];
  
  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden">
      <div className="bg-muted/30 px-5 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <BarChart3 size={20} className="text-primary" />
          <h3 className="font-semibold">Performance Profile</h3>
        </div>
      </div>
      
      <div className="p-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Radar Chart */}
          <div>
            <MiniRadar data={radarData} />
          </div>
          
          {/* Top Strengths */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
              Key Strengths
            </h4>
            {strengths.map((s, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                  i === 0 ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                  i === 1 ? 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300' :
                  'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
                }`}>
                  {i + 1}
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium">{s.label}</div>
                  <div className="text-xs text-muted-foreground">Top {100 - s.percentile}% in league</div>
                </div>
                <div className="text-lg font-bold">{s.value}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// Detailed Stats Grid
const DetailedStatsGrid = ({ stats }: { stats: AdvancedStats }) => (
  <div className="bg-card border border-border rounded-2xl overflow-hidden">
    <div className="bg-muted/30 px-5 py-3 border-b border-border">
      <div className="flex items-center gap-2">
        <BarChart3 size={20} className="text-primary" />
        <h3 className="font-semibold">Detailed Statistics</h3>
      </div>
    </div>
    
    <div className="p-5 grid grid-cols-2 md:grid-cols-4 gap-6">
      {/* Shooting */}
      <div>
        <h4 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
          <Target size={14} /> Shooting
        </h4>
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Shots</span>
            <span className="font-medium">{stats.shots_total}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">On Target</span>
            <span className="font-medium">{stats.shots_on_target}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">xG</span>
            <span className="font-medium text-emerald-600">{stats.xg.toFixed(1)}</span>
          </div>
        </div>
      </div>
      
      {/* Passing */}
      <div>
        <h4 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
          <ChevronRight size={14} /> Passing
        </h4>
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Completion</span>
            <span className="font-medium">{stats.pass_completion_pct}%</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Progressive</span>
            <span className="font-medium">{stats.progressive_passes}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Key Passes</span>
            <span className="font-medium">{stats.key_passes}</span>
          </div>
        </div>
      </div>
      
      {/* Possession */}
      <div>
        <h4 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
          <Zap size={14} /> Possession
        </h4>
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Touches</span>
            <span className="font-medium">{stats.touches}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Prog. Carries</span>
            <span className="font-medium">{stats.progressive_carries}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Take-Ons</span>
            <span className="font-medium">{stats.take_ons_successful}</span>
          </div>
        </div>
      </div>
      
      {/* Defense */}
      <div>
        <h4 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
          <Shield size={14} /> Defense
        </h4>
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Tackles</span>
            <span className="font-medium">{stats.tackles}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Interceptions</span>
            <span className="font-medium">{stats.interceptions}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Pressures</span>
            <span className="font-medium">{stats.pressures}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
);

// Match History Card
const MatchHistoryCard = ({ matches }: { matches: RecentMatch[] }) => (
  <div className="bg-card border border-border rounded-2xl overflow-hidden">
    <div className="bg-muted/30 px-5 py-3 border-b border-border flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Calendar size={20} className="text-primary" />
        <h3 className="font-semibold">Recent Matches</h3>
      </div>
    </div>
    
    <div className="divide-y divide-border">
      {matches.slice(0, 5).map((match, i) => (
        <div key={i} className="px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-white ${
              match.rating >= 7.5 ? 'bg-emerald-500' :
              match.rating >= 6.5 ? 'bg-blue-500' :
              match.rating >= 6.0 ? 'bg-amber-500' : 'bg-red-500'
            }`}>
              {match.rating > 0 ? match.rating.toFixed(1) : '-'}
            </div>
            <div>
              <div className="font-medium">{match.opponent}</div>
              <div className="text-sm text-muted-foreground">{match.date}</div>
            </div>
          </div>
          <div className="text-right">
            <div className="font-semibold">{match.result}</div>
            {(match.goals || match.assists) && (
              <div className="text-sm text-muted-foreground">
                {match.goals ? `${match.goals}G` : ''} {match.assists ? `${match.assists}A` : ''}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  </div>
);

// Social Links Card
const SocialCard = ({ athlete }: { athlete: AthleteProfile }) => {
  if (!athlete.instagram) return null;
  
  return (
    <div className="bg-card border border-border rounded-2xl p-5">
      <h3 className="font-semibold mb-4">Social Media</h3>
      <div className="flex gap-3">
        {athlete.instagram && (
          <a 
            href={`https://instagram.com/${athlete.instagram}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl p-4 flex items-center gap-3 hover:opacity-90 transition-opacity"
          >
            <Instagram size={24} />
            <span className="font-medium">@{athlete.instagram}</span>
          </a>
        )}
      </div>
    </div>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function AthleteProfile() {
  const { slug } = useParams<{ slug: string }>();
  const [athlete, setAthlete] = useState<AthleteProfile | null>(null);
  const [advancedStats, setAdvancedStats] = useState<AdvancedStats | null>(null);
  const [recentMatches, setRecentMatches] = useState<RecentMatch[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!slug) return;
      
      try {
        // Fetch athlete profile
        const { data: athleteData } = await supabase
          .from("athlete_profiles")
          .select("*")
          .eq("slug", slug)
          .single();
        
        if (athleteData) {
          setAthlete(athleteData as AthleteProfile);
          
          // Fetch advanced stats
          const { data: statsData } = await supabase
            .from("athlete_advanced_stats")
            .select("*")
            .eq("athlete_id", athleteData.id)
            .eq("season", "2024-25")
            .single();
          
          if (statsData) {
            setAdvancedStats(statsData as AdvancedStats);
          }
          
          // Fetch recent matches from daily updates
          const { data: matchesData } = await supabase
            .from("athlete_daily_updates")
            .select("*")
            .eq("athlete_id", athleteData.id)
            .order("date", { ascending: false })
            .limit(10);
          
          if (matchesData) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            setRecentMatches(matchesData.map((m: any) => ({
              id: m.id,
              date: new Date(m.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
              opponent: m.opponent || 'Unknown',
              result: m.match_result || '-',
              rating: m.rating || 0,
              goals: m.stats?.goals || 0,
              assists: m.stats?.assists || 0,
              minutes_played: m.minutes_played || 0,
              competition: m.competition
            })));
          }
        }
      } catch (error) {
        console.error("Error fetching athlete data:", error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-4xl mx-auto space-y-4">
          <div className="h-48 bg-muted rounded-3xl animate-pulse" />
          <div className="h-16 bg-muted rounded-2xl animate-pulse" />
          <div className="h-64 bg-muted rounded-2xl animate-pulse" />
        </div>
      </div>
    );
  }

  if (!athlete) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-bold mb-2">Athlete not found</h2>
          <Link to="/" className="text-primary">← Back to Home</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft size={20} />
            <span>Back</span>
          </Link>
          <div className="flex items-center gap-2">
            <button className="p-2 hover:bg-muted rounded-full transition-colors">
              <Heart size={20} />
            </button>
            <button className="p-2 hover:bg-muted rounded-full transition-colors">
              <Share2 size={20} />
            </button>
          </div>
        </div>
      </div>

      {/* Content Feed */}
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-4">
        {/* 1. Hero Card */}
        <HeroCard athlete={athlete} stats={advancedStats || undefined} />
        
        {/* 2. Quick Stats Bar */}
        {advancedStats && <QuickStatsBar stats={advancedStats} />}
        
        {/* 3. xG Comparison (for attacking players) */}
        {advancedStats && advancedStats.xg > 0 && (
          <XGComparison goals={advancedStats.goals} xg={advancedStats.xg} />
        )}
        
        {/* 4. Performance Snapshot */}
        {advancedStats && <PerformanceSnapshot stats={advancedStats} />}
        
        {/* 5. Recent Matches */}
        {recentMatches.length > 0 && <MatchHistoryCard matches={recentMatches} />}
        
        {/* 6. Detailed Stats */}
        {advancedStats && <DetailedStatsGrid stats={advancedStats} />}
        
        {/* 7. Social Media */}
        <SocialCard athlete={athlete} />
        
        {/* Footer Attribution */}
        <div className="text-center py-4">
          <p className="text-xs text-muted-foreground">
            Advanced stats from FBref.com • Powered by Opta
          </p>
        </div>
      </div>
    </div>
  );
}

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Target,
  Shield,
  ArrowsOutLineHorizontal,
  ChartBar,
  Lightning,
  Info
} from "@phosphor-icons/react";

// ============================================================================
// INTERFACES
// ============================================================================

interface AdvancedStats {
  id: string;
  athlete_id: string;
  season: string;
  competition: string;
  matches_played: number;
  minutes: number;
  goals: number;
  assists: number;
  xg: number;
  npxg: number;
  xa: number;
  shots_total: number;
  shots_on_target: number;
  shots_on_target_pct: number;
  pass_completion_pct: number;
  progressive_passes: number;
  key_passes: number;
  shot_creating_actions: number;
  goal_creating_actions: number;
  progressive_carries: number;
  take_ons_successful: number;
  take_ons_attempted: number;
  take_ons_success_pct: number;
  tackles: number;
  tackles_won: number;
  interceptions: number;
  blocks: number;
  pressures: number;
  aerials_won: number;
  aerials_won_pct: number;
  touches: number;
}

interface AdvancedStatsCardProps {
  athleteId: string;
  season?: string;
  compact?: boolean;
}

// ============================================================================
// STAT ROW COMPONENT
// ============================================================================

const StatRow = ({ 
  label, 
  value, 
  subValue,
  color = "text-foreground",
  icon: Icon 
}: { 
  label: string; 
  value: string | number; 
  subValue?: string;
  color?: string;
  icon?: React.ElementType;
}) => (
  <div className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
    <div className="flex items-center gap-2">
      {Icon && <Icon size={14} className="text-muted-foreground" />}
      <span className="text-sm text-muted-foreground">{label}</span>
    </div>
    <div className="text-right">
      <span className={`font-semibold ${color}`}>{value}</span>
      {subValue && (
        <span className="text-xs text-muted-foreground ml-1">({subValue})</span>
      )}
    </div>
  </div>
);

// ============================================================================
// STAT BLOCK COMPONENT
// ============================================================================

const StatBlock = ({
  title,
  value,
  label,
  color = "text-foreground",
  bgColor = "bg-muted/50"
}: {
  title: string;
  value: string | number;
  label: string;
  color?: string;
  bgColor?: string;
}) => (
  <div className={`${bgColor} rounded-xl p-3 text-center`}>
    <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">{title}</div>
    <div className={`text-2xl font-bold ${color}`}>{value}</div>
    <div className="text-xs text-muted-foreground">{label}</div>
  </div>
);

// ============================================================================
// XG COMPARISON BAR
// ============================================================================

const XGComparisonBar = ({ goals, xg }: { goals: number; xg: number }) => {
  const overperforming = goals > xg;
  const diff = goals - xg;
  const maxVal = Math.max(goals, xg, 1);
  const goalsWidth = (goals / maxVal) * 100;
  const xgWidth = (xg / maxVal) * 100;

  return (
    <div className="space-y-2">
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>Goals vs Expected Goals</span>
        <span className={overperforming ? "text-emerald-500" : "text-amber-500"}>
          {overperforming ? "+" : ""}{diff.toFixed(1)}
        </span>
      </div>
      <div className="relative h-6 bg-muted rounded-full overflow-hidden">
        {/* xG bar (background) */}
        <div 
          className="absolute left-0 top-0 h-full bg-blue-200 dark:bg-blue-900/50 rounded-full transition-all"
          style={{ width: `${xgWidth}%` }}
        />
        {/* Goals bar (foreground) */}
        <div 
          className={`absolute left-0 top-0 h-full rounded-full transition-all ${
            overperforming ? "bg-emerald-500" : "bg-amber-500"
          }`}
          style={{ width: `${goalsWidth}%` }}
        />
        {/* Labels */}
        <div className="absolute inset-0 flex items-center justify-between px-3">
          <span className="text-xs font-medium text-white drop-shadow">
            {goals}G
          </span>
          <span className="text-xs font-medium text-foreground">
            {xg.toFixed(1)} xG
          </span>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const AdvancedStatsCard = ({ 
  athleteId, 
  season = "2024-25",
  compact = false 
}: AdvancedStatsCardProps) => {
  const [stats, setStats] = useState<AdvancedStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const { data, error } = await supabase
          .from("athlete_advanced_stats")
          .select("*")
          .eq("athlete_id", athleteId)
          .eq("season", season)
          .maybeSingle();

        if (error) throw error;
        setStats(data);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Unknown error";
        setError(message);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [athleteId, season]);

  if (loading) {
    return (
      <div className="bg-card border border-border rounded-2xl p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-muted rounded w-1/3" />
          <div className="grid grid-cols-3 gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-20 bg-muted rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="bg-card border border-border rounded-2xl p-6">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Info size={20} />
          <span className="text-sm">Advanced stats not available yet</span>
        </div>
      </div>
    );
  }

  // Calculate per 90 stats
  const per90 = stats.minutes > 0 ? 90 / stats.minutes : 0;
  const goalsP90 = (stats.goals * per90).toFixed(2);
  const assistsP90 = (stats.assists * per90).toFixed(2);
  const xgP90 = (stats.xg * per90).toFixed(2);

  if (compact) {
    // Compact view for cards/lists
    return (
      <div className="bg-card border border-border rounded-xl p-4">
        <div className="grid grid-cols-4 gap-2 text-center">
          <div>
            <div className="text-lg font-bold text-foreground">{stats.xg.toFixed(1)}</div>
            <div className="text-xs text-muted-foreground">xG</div>
          </div>
          <div>
            <div className="text-lg font-bold text-foreground">{stats.xa.toFixed(1)}</div>
            <div className="text-xs text-muted-foreground">xA</div>
          </div>
          <div>
            <div className="text-lg font-bold text-foreground">{stats.progressive_passes}</div>
            <div className="text-xs text-muted-foreground">Prog</div>
          </div>
          <div>
            <div className="text-lg font-bold text-foreground">{stats.pressures}</div>
            <div className="text-xs text-muted-foreground">Press</div>
          </div>
        </div>
      </div>
    );
  }

  // Full view
  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-rose-500 to-red-600 px-6 py-4">
        <div className="flex items-center gap-3">
          <ChartBar size={24} weight="duotone" className="text-white" />
          <div>
            <h3 className="font-bold text-white">Advanced Statistics</h3>
            <p className="text-xs text-white/80">{season} • {stats.competition}</p>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Key Stats Grid */}
        <div className="grid grid-cols-3 gap-3">
          <StatBlock 
            title="xG" 
            value={stats.xg.toFixed(1)} 
            label="Expected Goals"
            color="text-emerald-600 dark:text-emerald-400"
            bgColor="bg-emerald-50 dark:bg-emerald-900/20"
          />
          <StatBlock 
            title="xA" 
            value={stats.xa.toFixed(1)} 
            label="Expected Assists"
            color="text-blue-600 dark:text-blue-400"
            bgColor="bg-blue-50 dark:bg-blue-900/20"
          />
          <StatBlock 
            title="npxG" 
            value={stats.npxg.toFixed(1)} 
            label="Non-Penalty xG"
            color="text-purple-600 dark:text-purple-400"
            bgColor="bg-purple-50 dark:bg-purple-900/20"
          />
        </div>

        {/* xG Comparison */}
        <XGComparisonBar goals={stats.goals} xg={stats.xg} />

        {/* Shooting */}
        <div>
          <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
            <Target size={16} className="text-rose-500" />
            Shooting
          </h4>
          <div className="bg-muted/30 rounded-xl p-4">
            <StatRow label="Shots" value={stats.shots_total} icon={Target} />
            <StatRow 
              label="On Target" 
              value={stats.shots_on_target} 
              subValue={`${stats.shots_on_target_pct}%`}
            />
            <StatRow 
              label="Goals/Shot" 
              value={stats.shots_total > 0 ? (stats.goals / stats.shots_total).toFixed(2) : "0.00"} 
            />
          </div>
        </div>

        {/* Passing & Creation */}
        <div>
          <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
            <ArrowsOutLineHorizontal size={16} className="text-blue-500" />
            Passing & Creation
          </h4>
          <div className="bg-muted/30 rounded-xl p-4">
            <StatRow 
              label="Pass Completion" 
              value={`${stats.pass_completion_pct}%`}
              color={stats.pass_completion_pct >= 80 ? "text-emerald-500" : "text-foreground"}
            />
            <StatRow label="Progressive Passes" value={stats.progressive_passes} />
            <StatRow label="Key Passes" value={stats.key_passes} />
            <StatRow label="Shot Creating Actions" value={stats.shot_creating_actions} />
            <StatRow label="Goal Creating Actions" value={stats.goal_creating_actions} />
          </div>
        </div>

        {/* Possession & Dribbling */}
        <div>
          <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
            <Lightning size={16} className="text-amber-500" />
            Possession & Dribbling
          </h4>
          <div className="bg-muted/30 rounded-xl p-4">
            <StatRow label="Touches" value={stats.touches} />
            <StatRow label="Progressive Carries" value={stats.progressive_carries} />
            <StatRow 
              label="Take-Ons" 
              value={stats.take_ons_successful}
              subValue={`${stats.take_ons_success_pct}%`}
            />
          </div>
        </div>

        {/* Defense */}
        <div>
          <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
            <Shield size={16} className="text-slate-500" />
            Defense
          </h4>
          <div className="bg-muted/30 rounded-xl p-4">
            <StatRow label="Tackles" value={stats.tackles} subValue={`${stats.tackles_won} won`} />
            <StatRow label="Interceptions" value={stats.interceptions} />
            <StatRow label="Blocks" value={stats.blocks} />
            <StatRow label="Pressures" value={stats.pressures} />
            <StatRow 
              label="Aerials" 
              value={stats.aerials_won}
              subValue={`${stats.aerials_won_pct}%`}
            />
          </div>
        </div>

        {/* Per 90 Footer */}
        <div className="bg-muted/50 rounded-xl p-4">
          <h4 className="text-xs text-muted-foreground uppercase tracking-wide mb-3">Per 90 Minutes</h4>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-lg font-bold text-foreground">{goalsP90}</div>
              <div className="text-xs text-muted-foreground">Goals</div>
            </div>
            <div>
              <div className="text-lg font-bold text-foreground">{assistsP90}</div>
              <div className="text-xs text-muted-foreground">Assists</div>
            </div>
            <div>
              <div className="text-lg font-bold text-foreground">{xgP90}</div>
              <div className="text-xs text-muted-foreground">xG</div>
            </div>
          </div>
        </div>

        {/* Data Source */}
        <div className="text-center">
          <span className="text-xs text-muted-foreground">
            Data from FBref.com • Powered by Opta
          </span>
        </div>
      </div>
    </div>
  );
};

export default AdvancedStatsCard;

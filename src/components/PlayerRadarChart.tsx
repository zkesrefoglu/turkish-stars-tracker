import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  Tooltip
} from "recharts";
import { ChartPie, Info } from "@phosphor-icons/react";

// ============================================================================
// INTERFACES
// ============================================================================

interface PercentileRankings {
  id: string;
  athlete_id: string;
  goals_per90_pct: number;
  npxg_per90_pct: number;
  xa_per90_pct: number;
  key_passes_per90_pct: number;
  progressive_passes_per90_pct: number;
  progressive_carries_per90_pct: number;
  take_ons_success_pct: number;
  sca_per90_pct: number;
  tackles_per90_pct: number;
  interceptions_per90_pct: number;
  pressures_per90_pct: number;
  aerials_won_pct_pct: number;
  comparison_group: string;
  minutes_played: number;
  period: string;
}

interface PlayerRadarChartProps {
  athleteId: string;
  primaryColor?: string;
  showLabels?: boolean;
  size?: "sm" | "md" | "lg";
}

// ============================================================================
// POSITION-BASED STAT CONFIGS
// ============================================================================

const OUTFIELD_STATS = [
  { key: "goals_per90_pct", label: "Goals", shortLabel: "Gls" },
  { key: "npxg_per90_pct", label: "npxG", shortLabel: "xG" },
  { key: "xa_per90_pct", label: "xA", shortLabel: "xA" },
  { key: "progressive_passes_per90_pct", label: "Prog Pass", shortLabel: "PrgP" },
  { key: "key_passes_per90_pct", label: "Key Pass", shortLabel: "KP" },
  { key: "sca_per90_pct", label: "Shot Creating", shortLabel: "SCA" },
  { key: "progressive_carries_per90_pct", label: "Prog Carry", shortLabel: "PrgC" },
  { key: "take_ons_success_pct", label: "Dribbles", shortLabel: "Drb" },
  { key: "pressures_per90_pct", label: "Pressures", shortLabel: "Prs" },
  { key: "tackles_per90_pct", label: "Tackles", shortLabel: "Tkl" },
];

const ATTACKER_STATS = [
  { key: "goals_per90_pct", label: "Goals", shortLabel: "Gls" },
  { key: "npxg_per90_pct", label: "npxG", shortLabel: "xG" },
  { key: "xa_per90_pct", label: "xA", shortLabel: "xA" },
  { key: "key_passes_per90_pct", label: "Key Pass", shortLabel: "KP" },
  { key: "sca_per90_pct", label: "Shot Creating", shortLabel: "SCA" },
  { key: "progressive_carries_per90_pct", label: "Prog Carry", shortLabel: "PrgC" },
  { key: "take_ons_success_pct", label: "Dribbles", shortLabel: "Drb" },
  { key: "pressures_per90_pct", label: "Pressures", shortLabel: "Prs" },
];

const MIDFIELDER_STATS = [
  { key: "progressive_passes_per90_pct", label: "Prog Pass", shortLabel: "PrgP" },
  { key: "key_passes_per90_pct", label: "Key Pass", shortLabel: "KP" },
  { key: "xa_per90_pct", label: "xA", shortLabel: "xA" },
  { key: "sca_per90_pct", label: "Shot Creating", shortLabel: "SCA" },
  { key: "progressive_carries_per90_pct", label: "Prog Carry", shortLabel: "PrgC" },
  { key: "take_ons_success_pct", label: "Dribbles", shortLabel: "Drb" },
  { key: "tackles_per90_pct", label: "Tackles", shortLabel: "Tkl" },
  { key: "interceptions_per90_pct", label: "Interceptions", shortLabel: "Int" },
  { key: "pressures_per90_pct", label: "Pressures", shortLabel: "Prs" },
];

const DEFENDER_STATS = [
  { key: "tackles_per90_pct", label: "Tackles", shortLabel: "Tkl" },
  { key: "interceptions_per90_pct", label: "Interceptions", shortLabel: "Int" },
  { key: "pressures_per90_pct", label: "Pressures", shortLabel: "Prs" },
  { key: "aerials_won_pct_pct", label: "Aerials", shortLabel: "Aer" },
  { key: "progressive_passes_per90_pct", label: "Prog Pass", shortLabel: "PrgP" },
  { key: "progressive_carries_per90_pct", label: "Prog Carry", shortLabel: "PrgC" },
];

// ============================================================================
// CUSTOM TOOLTIP
// ============================================================================

interface TooltipPayload {
  payload: {
    label: string;
    value: number;
  };
}

const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: TooltipPayload[] }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-card border border-border rounded-lg px-3 py-2 shadow-lg">
        <p className="text-sm font-semibold text-foreground">{data.label}</p>
        <p className="text-xs text-muted-foreground">
          Percentile: <span className="font-bold text-accent">{data.value}</span>
        </p>
      </div>
    );
  }
  return null;
};

// ============================================================================
// GET PERCENTILE COLOR
// ============================================================================

const getPercentileColor = (value: number): string => {
  if (value >= 90) return "text-emerald-500";
  if (value >= 70) return "text-blue-500";
  if (value >= 50) return "text-foreground";
  if (value >= 30) return "text-amber-500";
  return "text-red-500";
};

const getPercentileLabel = (value: number): string => {
  if (value >= 90) return "Elite";
  if (value >= 70) return "Very Good";
  if (value >= 50) return "Average";
  if (value >= 30) return "Below Avg";
  return "Poor";
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const PlayerRadarChart = ({
  athleteId,
  primaryColor = "#E30A17", // Turkish red
  showLabels = true,
  size = "md"
}: PlayerRadarChartProps) => {
  const [rankings, setRankings] = useState<PercentileRankings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRankings = async () => {
      try {
        const { data, error } = await supabase
          .from("athlete_percentile_rankings")
          .select("*")
          .eq("athlete_id", athleteId)
          .maybeSingle();

        if (error) throw error;
        setRankings(data);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Unknown error";
        setError(message);
      } finally {
        setLoading(false);
      }
    };

    fetchRankings();
  }, [athleteId]);

  // Size configurations
  const sizeConfig = {
    sm: { height: 200, fontSize: 10 },
    md: { height: 300, fontSize: 11 },
    lg: { height: 400, fontSize: 12 }
  };
  const config = sizeConfig[size];

  if (loading) {
    return (
      <div className="bg-card border border-border rounded-2xl p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-muted rounded w-1/3 mb-4" />
          <div 
            className="bg-muted rounded-full mx-auto" 
            style={{ height: config.height, width: config.height }}
          />
        </div>
      </div>
    );
  }

  if (error || !rankings) {
    return (
      <div className="bg-card border border-border rounded-2xl p-6">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Info size={20} />
          <span className="text-sm">Percentile rankings not available yet</span>
        </div>
      </div>
    );
  }

  // Determine which stats to show based on comparison group
  let statsConfig = OUTFIELD_STATS;
  const group = rankings.comparison_group?.toLowerCase() || "";
  
  if (group.includes("forward") || group.includes("wing") || group.includes("attack")) {
    statsConfig = ATTACKER_STATS;
  } else if (group.includes("midfield") || group.includes("central")) {
    statsConfig = MIDFIELDER_STATS;
  } else if (group.includes("defender") || group.includes("back")) {
    statsConfig = DEFENDER_STATS;
  }

  // Build chart data
  const chartData = statsConfig.map(stat => ({
    stat: stat.shortLabel,
    label: stat.label,
    value: (rankings as unknown as Record<string, number>)[stat.key] || 0,
    fullMark: 100
  }));

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border">
        <div className="flex items-center gap-3">
          <ChartPie size={24} weight="duotone" className="text-accent" />
          <div>
            <h3 className="font-bold text-foreground">Scouting Report</h3>
            <p className="text-xs text-muted-foreground">
              vs {rankings.comparison_group || "Positional Peers"} • {rankings.period}
            </p>
          </div>
        </div>
      </div>

      {/* Radar Chart */}
      <div className="p-4">
        <ResponsiveContainer width="100%" height={config.height}>
          <RadarChart cx="50%" cy="50%" outerRadius="80%" data={chartData}>
            <PolarGrid 
              stroke="#e5e7eb" 
              strokeDasharray="3 3"
            />
            <PolarAngleAxis 
              dataKey="stat" 
              tick={{ 
                fill: 'currentColor', 
                fontSize: config.fontSize,
                className: 'text-muted-foreground'
              }}
            />
            <PolarRadiusAxis 
              angle={90} 
              domain={[0, 100]} 
              tick={{ fontSize: 9 }}
              tickCount={5}
              stroke="#9ca3af"
            />
            <Radar
              name="Percentile"
              dataKey="value"
              stroke={primaryColor}
              fill={primaryColor}
              fillOpacity={0.3}
              strokeWidth={2}
            />
            <Tooltip content={<CustomTooltip />} />
          </RadarChart>
        </ResponsiveContainer>
      </div>

      {/* Stats List */}
      {showLabels && (
        <div className="px-6 pb-6">
          <div className="grid grid-cols-2 gap-2">
            {chartData.map((item, index) => (
              <div 
                key={index}
                className="flex items-center justify-between bg-muted/30 rounded-lg px-3 py-2"
              >
                <span className="text-xs text-muted-foreground">{item.label}</span>
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-bold ${getPercentileColor(item.value)}`}>
                    {item.value}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    {getPercentileLabel(item.value)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="px-6 py-3 bg-muted/30 border-t border-border">
        <div className="flex justify-between items-center">
          <span className="text-xs text-muted-foreground">
            Based on {rankings.minutes_played?.toLocaleString()} minutes
          </span>
          <span className="text-xs text-muted-foreground">
            FBref / Opta
          </span>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// MINI RADAR (for cards/compact views)
// ============================================================================

export const MiniRadar = ({
  athleteId,
  primaryColor = "#E30A17"
}: {
  athleteId: string;
  primaryColor?: string;
}) => {
  return (
    <PlayerRadarChart
      athleteId={athleteId}
      primaryColor={primaryColor}
      showLabels={false}
      size="sm"
    />
  );
};

export default PlayerRadarChart;

import { useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { Card } from "@/components/ui/card";
import { format } from "date-fns";
import { TrendingUp } from "lucide-react";

interface DailyUpdate {
  id: string;
  date: string;
  played: boolean;
  opponent: string | null;
  stats: {
    points?: number;
    rebounds?: number;
    assists?: number;
    blocks?: number;
    steals?: number;
    minutes?: number;
  } | null;
}

interface NBAGameStatsChartProps {
  matches: DailyUpdate[];
  maxGames?: number;
}

interface ChartDataPoint {
  game: string;
  date: string;
  opponent: string;
  PTS: number;
  REB: number;
  AST: number;
  fullDate: string;
}

export const NBAGameStatsChart = ({ matches, maxGames = 20 }: NBAGameStatsChartProps) => {
  const { chartData, averages } = useMemo(() => {
    // Filter to only played games with stats, sort by date ascending
    const playedGames = matches
      .filter((m) => m.played && m.stats && typeof m.stats.points === "number")
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(-maxGames); // Take the most recent maxGames

    const data: ChartDataPoint[] = playedGames.map((game, index) => ({
      game: `G${index + 1}`,
      date: format(new Date(game.date), "M/d"),
      opponent: game.opponent || "Unknown",
      fullDate: format(new Date(game.date), "MMM d, yyyy"),
      PTS: game.stats?.points || 0,
      REB: game.stats?.rebounds || 0,
      AST: game.stats?.assists || 0,
    }));

    // Calculate averages
    const totalPts = data.reduce((sum, g) => sum + g.PTS, 0);
    const totalReb = data.reduce((sum, g) => sum + g.REB, 0);
    const totalAst = data.reduce((sum, g) => sum + g.AST, 0);
    const count = data.length || 1;

    return {
      chartData: data,
      averages: {
        PTS: totalPts / count,
        REB: totalReb / count,
        AST: totalAst / count,
      },
    };
  }, [matches, maxGames]);

  if (chartData.length < 2) {
    return null;
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload as ChartDataPoint;
      return (
        <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
          <p className="font-semibold text-foreground text-sm mb-1">
            vs {data.opponent}
          </p>
          <p className="text-xs text-muted-foreground mb-2">{data.fullDate}</p>
          <div className="space-y-1">
            <p className="text-sm">
              <span className="inline-block w-3 h-3 rounded-full bg-[hsl(var(--chart-1))] mr-2" />
              <span className="text-foreground font-medium">{data.PTS}</span>{" "}
              <span className="text-muted-foreground">PTS</span>
            </p>
            <p className="text-sm">
              <span className="inline-block w-3 h-3 rounded-full bg-[hsl(var(--chart-2))] mr-2" />
              <span className="text-foreground font-medium">{data.REB}</span>{" "}
              <span className="text-muted-foreground">REB</span>
            </p>
            <p className="text-sm">
              <span className="inline-block w-3 h-3 rounded-full bg-[hsl(var(--chart-3))] mr-2" />
              <span className="text-foreground font-medium">{data.AST}</span>{" "}
              <span className="text-muted-foreground">AST</span>
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="p-4 bg-card border-border">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-accent" />
          Game-by-Game Stats
        </h3>
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[hsl(var(--chart-1))]" />
            <span className="text-muted-foreground">PTS</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[hsl(var(--chart-2))]" />
            <span className="text-muted-foreground">REB</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[hsl(var(--chart-3))]" />
            <span className="text-muted-foreground">AST</span>
          </div>
        </div>
      </div>

      <div className="h-[220px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={chartData}
            margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="hsl(var(--border))"
              opacity={0.5}
            />
            <XAxis
              dataKey="date"
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
              tickLine={false}
              axisLine={{ stroke: "hsl(var(--border))" }}
            />
            <YAxis
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
              tickLine={false}
              axisLine={{ stroke: "hsl(var(--border))" }}
              domain={[0, "auto"]}
            />
            <Tooltip content={<CustomTooltip />} />
            
            {/* Jokic benchmark line at 30 PTS */}
            <ReferenceLine
              y={30}
              stroke="hsl(43 80% 40%)"
              strokeWidth={2}
              label={{ value: "Jokic", position: "right", fill: "hsl(43 80% 40%)", fontSize: 11 }}
            />
            
            {/* Average reference line */}
            <ReferenceLine
              y={averages.PTS}
              stroke="hsl(var(--chart-1))"
              strokeDasharray="5 5"
              strokeOpacity={0.4}
            />
            
            <Line
              type="monotone"
              dataKey="PTS"
              stroke="hsl(var(--chart-1))"
              strokeWidth={2.5}
              dot={{ fill: "hsl(var(--chart-1))", strokeWidth: 0, r: 3 }}
              activeDot={{ r: 5, fill: "hsl(var(--chart-1))" }}
            />
            <Line
              type="monotone"
              dataKey="REB"
              stroke="hsl(var(--chart-2))"
              strokeWidth={2.5}
              dot={{ fill: "hsl(var(--chart-2))", strokeWidth: 0, r: 3 }}
              activeDot={{ r: 5, fill: "hsl(var(--chart-2))" }}
            />
            <Line
              type="monotone"
              dataKey="AST"
              stroke="hsl(var(--chart-3))"
              strokeWidth={2.5}
              dot={{ fill: "hsl(var(--chart-3))", strokeWidth: 0, r: 3 }}
              activeDot={{ r: 5, fill: "hsl(var(--chart-3))" }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Averages row */}
      <div className="flex justify-center gap-6 mt-3 pt-3 border-t border-border">
        <div className="text-center">
          <span className="text-xs text-muted-foreground">Avg PTS</span>
          <div className="text-sm font-semibold text-foreground">
            {averages.PTS.toFixed(1)}
          </div>
        </div>
        <div className="text-center">
          <span className="text-xs text-muted-foreground">Avg REB</span>
          <div className="text-sm font-semibold text-foreground">
            {averages.REB.toFixed(1)}
          </div>
        </div>
        <div className="text-center">
          <span className="text-xs text-muted-foreground">Avg AST</span>
          <div className="text-sm font-semibold text-foreground">
            {averages.AST.toFixed(1)}
          </div>
        </div>
      </div>
    </Card>
  );
};

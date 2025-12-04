import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";

interface MatchData {
  id: string;
  date: string;
  opponent: string | null;
  rating: number | null;
  played: boolean;
}

interface RatingTrendChartProps {
  matches: MatchData[];
  maxMatches?: number;
}

export const RatingTrendChart = ({ matches, maxMatches = 15 }: RatingTrendChartProps) => {
  // Filter to played matches with ratings, sort oldest to newest for chart
  const chartData = matches
    .filter((m) => m.played && m.rating !== null)
    .slice(0, maxMatches)
    .reverse() // Oldest first for left-to-right progression
    .map((m, index) => ({
      index: index + 1,
      rating: m.rating,
      opponent: m.opponent || "Unknown",
      date: m.date,
    }));

  if (chartData.length < 2) {
    return null; // Need at least 2 points for a trend line
  }

  // Calculate trend (comparing first half avg to second half avg)
  const midpoint = Math.floor(chartData.length / 2);
  const firstHalfAvg = chartData.slice(0, midpoint).reduce((sum, d) => sum + (d.rating || 0), 0) / midpoint;
  const secondHalfAvg = chartData.slice(midpoint).reduce((sum, d) => sum + (d.rating || 0), 0) / (chartData.length - midpoint);
  const trendDirection = secondHalfAvg > firstHalfAvg + 0.1 ? "↑" : secondHalfAvg < firstHalfAvg - 0.1 ? "↓" : "→";
  const trendColor = trendDirection === "↑" ? "text-emerald-500" : trendDirection === "↓" ? "text-red-500" : "text-muted-foreground";

  return (
    <div className="bg-background/80 rounded-lg p-3 min-w-[180px]">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-muted-foreground uppercase">Rating Trend</span>
        <span className={`text-sm font-bold ${trendColor}`}>{trendDirection}</span>
      </div>
      <div className="h-[70px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="ratingGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--accent))" stopOpacity={0.6} />
                <stop offset="95%" stopColor="hsl(var(--accent))" stopOpacity={0.1} />
              </linearGradient>
            </defs>
            <XAxis dataKey="index" hide />
            <YAxis domain={[5.5, 9]} hide />
            <ReferenceLine y={7} stroke="hsl(var(--muted-foreground))" strokeDasharray="3 3" strokeOpacity={0.5} />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload;
                  return (
                    <div className="bg-card border border-border rounded px-2 py-1 text-xs shadow-lg">
                      <div className="font-semibold text-foreground">vs {data.opponent}</div>
                      <div className="text-muted-foreground">Rating: {data.rating?.toFixed(1)}</div>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Area
              type="monotone"
              dataKey="rating"
              stroke="hsl(var(--accent))"
              strokeWidth={2}
              fill="url(#ratingGradient)"
              dot={false}
              activeDot={{ r: 4, fill: "hsl(var(--accent))" }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

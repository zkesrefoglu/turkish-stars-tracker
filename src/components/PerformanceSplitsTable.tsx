import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Minus, Home, Plane } from "lucide-react";

interface SplitData {
  label: string;
  gp: number;
  min?: number;
  pts: number;
  reb: number;
  ast: number;
  stl?: number;
  blk?: number;
  fg_pct?: number;
  three_pct?: number;
  ft_pct?: number;
}

interface PerformanceSplitsTableProps {
  splits: SplitData[];
  seasonAverages?: {
    pts: number;
    reb: number;
    ast: number;
  };
}

export const PerformanceSplitsTable = ({ splits, seasonAverages }: PerformanceSplitsTableProps) => {
  if (!splits || splits.length === 0) return null;

  const getTrendIcon = (value: number, average: number) => {
    const diff = value - average;
    const threshold = average * 0.1; // 10% threshold
    
    if (diff > threshold) return <TrendingUp className="w-3 h-3 text-emerald-500" />;
    if (diff < -threshold) return <TrendingDown className="w-3 h-3 text-red-500" />;
    return <Minus className="w-3 h-3 text-muted-foreground" />;
  };

  const getSplitIcon = (label: string) => {
    if (label.toLowerCase().includes('home')) return <Home className="w-3 h-3" />;
    if (label.toLowerCase().includes('road') || label.toLowerCase().includes('away')) return <Plane className="w-3 h-3" />;
    return null;
  };

  const formatPct = (value: number | undefined) => {
    if (value === undefined || value === null) return '—';
    // If value is already a percentage (e.g., 45.5), just format it
    // If it's a decimal (e.g., 0.455), multiply by 100
    const pct = value > 1 ? value : value * 100;
    return `${pct.toFixed(1)}%`;
  };

  return (
    <Card className="p-4 bg-card border-border">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Performance Splits
        </h3>
        {seasonAverages && (
          <Badge variant="outline" className="text-xs">
            Season: {seasonAverages.pts.toFixed(1)} / {seasonAverages.reb.toFixed(1)} / {seasonAverages.ast.toFixed(1)}
          </Badge>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-2 px-2 text-muted-foreground font-medium">Split</th>
              <th className="text-center py-2 px-2 text-muted-foreground font-medium">GP</th>
              <th className="text-center py-2 px-2 text-muted-foreground font-medium">MIN</th>
              <th className="text-center py-2 px-2 text-muted-foreground font-medium">PTS</th>
              <th className="text-center py-2 px-2 text-muted-foreground font-medium">REB</th>
              <th className="text-center py-2 px-2 text-muted-foreground font-medium">AST</th>
              <th className="text-center py-2 px-2 text-muted-foreground font-medium">FG%</th>
              <th className="text-center py-2 px-2 text-muted-foreground font-medium">3P%</th>
            </tr>
          </thead>
          <tbody>
            {splits.map((split, index) => (
              <tr 
                key={index} 
                className={`border-b border-border/50 hover:bg-secondary/30 transition-colors ${
                  split.label.toLowerCase().includes('season') || split.label.includes('2024') 
                    ? 'bg-secondary/20 font-medium' 
                    : ''
                }`}
              >
                <td className="py-2.5 px-2">
                  <div className="flex items-center gap-1.5">
                    {getSplitIcon(split.label)}
                    <span className="text-foreground">{split.label}</span>
                  </div>
                </td>
                <td className="text-center py-2.5 px-2 text-muted-foreground">{split.gp}</td>
                <td className="text-center py-2.5 px-2 text-muted-foreground">
                  {split.min?.toFixed(1) || '—'}
                </td>
                <td className="text-center py-2.5 px-2">
                  <div className="flex items-center justify-center gap-1">
                    <span className={split.pts >= 25 ? 'text-accent font-semibold' : 'text-foreground'}>
                      {split.pts.toFixed(1)}
                    </span>
                    {seasonAverages && getTrendIcon(split.pts, seasonAverages.pts)}
                  </div>
                </td>
                <td className="text-center py-2.5 px-2">
                  <div className="flex items-center justify-center gap-1">
                    <span className={split.reb >= 10 ? 'text-accent font-semibold' : 'text-foreground'}>
                      {split.reb.toFixed(1)}
                    </span>
                    {seasonAverages && getTrendIcon(split.reb, seasonAverages.reb)}
                  </div>
                </td>
                <td className="text-center py-2.5 px-2">
                  <div className="flex items-center justify-center gap-1">
                    <span className={split.ast >= 7 ? 'text-accent font-semibold' : 'text-foreground'}>
                      {split.ast.toFixed(1)}
                    </span>
                    {seasonAverages && getTrendIcon(split.ast, seasonAverages.ast)}
                  </div>
                </td>
                <td className="text-center py-2.5 px-2 text-muted-foreground">
                  {formatPct(split.fg_pct)}
                </td>
                <td className="text-center py-2.5 px-2 text-muted-foreground">
                  {formatPct(split.three_pct)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
};

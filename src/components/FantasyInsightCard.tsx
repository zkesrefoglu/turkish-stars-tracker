import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkles, TrendingUp, Users } from "lucide-react";

interface FantasyInsightCardProps {
  insight: string | null;
  positionRank?: number | null;
  rosterPct?: number | null;
  position?: string;
}

export const FantasyInsightCard = ({ 
  insight, 
  positionRank, 
  rosterPct,
  position = "C"
}: FantasyInsightCardProps) => {
  if (!insight && !positionRank && !rosterPct) return null;

  const getRankColor = (rank: number) => {
    if (rank <= 3) return 'bg-accent text-accent-foreground';
    if (rank <= 10) return 'bg-primary text-primary-foreground';
    if (rank <= 25) return 'bg-secondary text-secondary-foreground';
    return 'bg-muted text-muted-foreground';
  };

  const getRosterColor = (pct: number) => {
    if (pct >= 90) return 'text-accent';
    if (pct >= 70) return 'text-primary';
    if (pct >= 50) return 'text-foreground';
    return 'text-muted-foreground';
  };

  return (
    <Card className="p-4 bg-gradient-to-br from-card to-secondary/20 border-border overflow-hidden">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="w-4 h-4 text-accent" />
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Fantasy Insight
        </h3>
      </div>

      {/* Rankings Row */}
      {(positionRank || rosterPct) && (
        <div className="flex flex-wrap gap-3 mb-4">
          {positionRank && (
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Position Rank:</span>
              <Badge className={`${getRankColor(positionRank)} font-bold`}>
                #{positionRank} {position}
              </Badge>
            </div>
          )}
          
          {rosterPct && (
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Rostered:</span>
              <span className={`font-semibold ${getRosterColor(rosterPct)}`}>
                {rosterPct.toFixed(1)}%
              </span>
            </div>
          )}
        </div>
      )}

      {/* Insight Text */}
      {insight && (
        <div className="bg-secondary/50 rounded-lg p-3">
          <p className="text-sm text-foreground leading-relaxed italic">
            "{insight}"
          </p>
          <div className="text-xs text-muted-foreground mt-2 text-right">
            — ESPN Fantasy Analysis
          </div>
        </div>
      )}
    </Card>
  );
};

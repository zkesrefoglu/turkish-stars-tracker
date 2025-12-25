import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { TrendingUp, Star } from "lucide-react";

interface EfficiencyRanking {
  id: string;
  player_name: string;
  team: string;
  per: number | null;
  ts_pct: number | null;
  ws: number | null;
  efficiency_index: number | null;
  is_featured_athlete: boolean;
  month: string;
}

interface EfficiencyRankingsTableProps {
  rankings: EfficiencyRanking[];
  athleteName: string;
}

// Helper to extract player name from markdown link format: [Name](url)
const parsePlayerName = (name: string): string => {
  const match = name.match(/^\[([^\]]+)\]/);
  return match ? match[1] : name;
};

export const EfficiencyRankingsTable = ({ rankings, athleteName }: EfficiencyRankingsTableProps) => {
  if (!rankings || rankings.length === 0) {
    return null;
  }

  // Get the most recent month's data
  const latestMonth = rankings[0]?.month;
  const latestRankings = rankings.filter(r => r.month === latestMonth);

  // Sort by efficiency index descending
  const sortedRankings = [...latestRankings].sort((a, b) => 
    (b.efficiency_index || 0) - (a.efficiency_index || 0)
  );

  // Find athlete's rank
  const athleteRank = sortedRankings.findIndex(r => r.is_featured_athlete) + 1;

  return (
    <Card className="bg-card border-border mt-6">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-accent" />
            <CardTitle className="text-lg">Efficiency Index Rankings</CardTitle>
          </div>
          <Badge variant="outline" className="text-xs">
            {format(new Date(latestMonth), "MMMM yyyy")}
          </Badge>
        </div>
        <CardDescription className="text-xs mt-1">
          Comparing {athleteName} to top NBA performers based on PER, TS%, Win Shares, and Efficiency Index
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-border">
                <TableHead className="text-muted-foreground w-12">#</TableHead>
                <TableHead className="text-muted-foreground">Player</TableHead>
                <TableHead className="text-muted-foreground">Team</TableHead>
                <TableHead className="text-muted-foreground text-center">PER</TableHead>
                <TableHead className="text-muted-foreground text-center">TS%</TableHead>
                <TableHead className="text-muted-foreground text-center">WS</TableHead>
                <TableHead className="text-muted-foreground text-center">Eff. Index</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedRankings.map((ranking, index) => (
                <TableRow 
                  key={ranking.id} 
                  className={`border-border ${ranking.is_featured_athlete ? 'bg-accent/10' : ''}`}
                >
                  <TableCell className="font-medium text-muted-foreground">
                    {index + 1}
                  </TableCell>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      {ranking.is_featured_athlete && (
                        <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                      )}
                      <span className={ranking.is_featured_athlete ? 'text-foreground font-semibold' : 'text-foreground'}>
                        {parsePlayerName(ranking.player_name)}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{ranking.team}</TableCell>
                  <TableCell className="text-center">
                    {ranking.per ? ranking.per.toFixed(1) : '—'}
                  </TableCell>
                  <TableCell className="text-center">
                    {ranking.ts_pct ? `${(ranking.ts_pct * 100).toFixed(1)}%` : '—'}
                  </TableCell>
                  <TableCell className="text-center">
                    {ranking.ws ? ranking.ws.toFixed(1) : '—'}
                  </TableCell>
                  <TableCell className="text-center">
                    <span className={`font-semibold ${ranking.is_featured_athlete ? 'text-accent' : 'text-foreground'}`}>
                      {ranking.efficiency_index ? ranking.efficiency_index.toFixed(2) : '—'}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        
        {athleteRank > 0 && (
          <div className="mt-4 p-3 bg-secondary rounded-lg">
            <p className="text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">{athleteName}</span> ranks{' '}
              <span className="font-semibold text-accent">#{athleteRank}</span> among these top performers.
              {athleteRank <= 5 ? ' An elite level of efficiency!' : 
               athleteRank <= 10 ? ' Placing among the top tier in the league.' : ''}
            </p>
          </div>
        )}

        <p className="text-[10px] text-muted-foreground mt-3">
          Sources: Basketball-Reference, StatMuse, NBA.com, ESPN, TeamRankings
        </p>
      </CardContent>
    </Card>
  );
};

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Trophy, TrendingUp, TrendingDown } from "lucide-react";

interface TeamStanding {
  teamId: number;
  name: string;
  city: string;
  abbr: string;
  division: string;
  wins: number;
  losses: number;
  winPct: number;
  gamesBehind: number;
  streak: string;
  last10: string;
  homeRecord: string;
  awayRecord: string;
}

interface NBAStandingsTableProps {
  highlightTeam?: string; // Team name to highlight (e.g., "Rockets")
}

export const NBAStandingsTable = ({ highlightTeam = "Rockets" }: NBAStandingsTableProps) => {
  const [standings, setStandings] = useState<TeamStanding[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStandings = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const { data, error: fnError } = await supabase.functions.invoke('fetch-nba-standings');
        
        if (fnError) {
          throw fnError;
        }
        
        if (data?.standings) {
          setStandings(data.standings);
        }
      } catch (err: any) {
        console.error('Error fetching standings:', err);
        setError(err.message || 'Failed to load standings');
      } finally {
        setLoading(false);
      }
    };

    fetchStandings();
  }, []);

  const getStreakColor = (streak: string) => {
    if (streak.startsWith('W')) {
      return 'text-emerald-500';
    } else if (streak.startsWith('L')) {
      return 'text-red-500';
    }
    return 'text-muted-foreground';
  };

  const getStreakIcon = (streak: string) => {
    if (streak.startsWith('W')) {
      return <TrendingUp className="w-3 h-3 inline mr-0.5" />;
    } else if (streak.startsWith('L')) {
      return <TrendingDown className="w-3 h-3 inline mr-0.5" />;
    }
    return null;
  };

  if (loading) {
    return (
      <Card className="p-4 bg-card border-border">
        <div className="flex items-center gap-2 mb-4">
          <Trophy className="w-5 h-5 text-accent" />
          <h3 className="font-semibold text-foreground">Western Conference Standings</h3>
        </div>
        <div className="space-y-2">
          {[...Array(10)].map((_, i) => (
            <Skeleton key={i} className="h-8 w-full" />
          ))}
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="p-4 bg-card border-border">
        <div className="flex items-center gap-2 mb-4">
          <Trophy className="w-5 h-5 text-accent" />
          <h3 className="font-semibold text-foreground">Western Conference Standings</h3>
        </div>
        <p className="text-sm text-muted-foreground">Unable to load standings</p>
      </Card>
    );
  }

  // Find the highlighted team's position
  const highlightedTeamIndex = standings.findIndex(t => t.name === highlightTeam);
  const highlightedTeam = highlightedTeamIndex !== -1 ? standings[highlightedTeamIndex] : null;

  return (
    <Card className="p-4 bg-card border-border overflow-hidden">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Trophy className="w-5 h-5 text-accent" />
          <h3 className="font-semibold text-foreground">Western Conference Standings</h3>
        </div>
        {highlightedTeam && (
          <div className="text-sm text-muted-foreground">
            <span className="font-medium text-accent">{highlightTeam}</span>
            <span className="ml-1">#{highlightedTeamIndex + 1}</span>
          </div>
        )}
      </div>
      
      <div className="overflow-x-auto -mx-4 px-4">
        <Table>
          <TableHeader>
            <TableRow className="border-border hover:bg-transparent">
              <TableHead className="w-10 text-muted-foreground text-xs">#</TableHead>
              <TableHead className="text-muted-foreground text-xs">Team</TableHead>
              <TableHead className="text-center text-muted-foreground text-xs">W</TableHead>
              <TableHead className="text-center text-muted-foreground text-xs">L</TableHead>
              <TableHead className="text-center text-muted-foreground text-xs hidden sm:table-cell">PCT</TableHead>
              <TableHead className="text-center text-muted-foreground text-xs">GB</TableHead>
              <TableHead className="text-center text-muted-foreground text-xs hidden md:table-cell">L10</TableHead>
              <TableHead className="text-center text-muted-foreground text-xs hidden lg:table-cell">STRK</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {standings.map((team, index) => {
              const isHighlighted = team.name === highlightTeam;
              const isPlayoffSpot = index < 6;
              const isPlayInSpot = index >= 6 && index < 10;
              
              return (
                <TableRow 
                  key={team.teamId}
                  className={`border-border transition-colors ${
                    isHighlighted 
                      ? 'bg-accent/10 hover:bg-accent/15' 
                      : 'hover:bg-muted/50'
                  }`}
                >
                  <TableCell className="py-2">
                    <span className={`text-xs font-medium ${
                      isPlayoffSpot ? 'text-emerald-500' : 
                      isPlayInSpot ? 'text-yellow-500' : 
                      'text-muted-foreground'
                    }`}>
                      {index + 1}
                    </span>
                  </TableCell>
                  <TableCell className="py-2">
                    <div className="flex items-center gap-2">
                      <span className={`font-medium text-sm ${
                        isHighlighted ? 'text-accent' : 'text-foreground'
                      }`}>
                        {team.abbr}
                      </span>
                      <span className="text-xs text-muted-foreground hidden sm:inline">
                        {team.city}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-center py-2">
                    <span className="text-sm font-medium text-foreground">{team.wins}</span>
                  </TableCell>
                  <TableCell className="text-center py-2">
                    <span className="text-sm text-muted-foreground">{team.losses}</span>
                  </TableCell>
                  <TableCell className="text-center py-2 hidden sm:table-cell">
                    <span className="text-sm text-muted-foreground">
                      {team.winPct.toFixed(3).replace('0.', '.')}
                    </span>
                  </TableCell>
                  <TableCell className="text-center py-2">
                    <span className="text-sm text-muted-foreground">
                      {team.gamesBehind === 0 ? '-' : team.gamesBehind.toFixed(1)}
                    </span>
                  </TableCell>
                  <TableCell className="text-center py-2 hidden md:table-cell">
                    <span className="text-xs text-muted-foreground">{team.last10}</span>
                  </TableCell>
                  <TableCell className="text-center py-2 hidden lg:table-cell">
                    <span className={`text-xs font-medium ${getStreakColor(team.streak)}`}>
                      {getStreakIcon(team.streak)}
                      {team.streak}
                    </span>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
      
      <div className="mt-3 pt-3 border-t border-border flex flex-wrap gap-3 text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
          Playoff (1-6)
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-yellow-500"></span>
          Play-In (7-10)
        </span>
      </div>
    </Card>
  );
};

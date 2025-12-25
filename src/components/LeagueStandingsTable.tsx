import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Trophy, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";

// NBA Standings types
interface NBATeamStanding {
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

// Football Standings types
interface FootballTeamStanding {
  rank: number;
  teamId: number;
  teamName: string;
  teamLogo: string;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDiff: number;
  points: number;
  form: string;
}

interface LeagueStandingsTableProps {
  sport: string;
  league: string;
  highlightTeam?: string;
}

// Helper to get compact view indices (team + 2 above + 2 below)
const getCompactIndices = (teamIndex: number, totalLength: number): number[] => {
  const indices: number[] = [];
  const radius = 2; // Show 2 teams above and below
  
  for (let i = teamIndex - radius; i <= teamIndex + radius; i++) {
    if (i >= 0 && i < totalLength) {
      indices.push(i);
    }
  }
  
  // Ensure we have at least 5 teams if possible
  while (indices.length < 5 && indices.length < totalLength) {
    const firstIdx = indices[0];
    const lastIdx = indices[indices.length - 1];
    
    if (firstIdx > 0) {
      indices.unshift(firstIdx - 1);
    } else if (lastIdx < totalLength - 1) {
      indices.push(lastIdx + 1);
    } else {
      break;
    }
  }
  
  return indices;
};

export const LeagueStandingsTable = ({ sport, league, highlightTeam }: LeagueStandingsTableProps) => {
  const [nbaStandings, setNbaStandings] = useState<NBATeamStanding[]>([]);
  const [footballStandings, setFootballStandings] = useState<FootballTeamStanding[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const fetchStandings = async () => {
      try {
        setLoading(true);
        setError(null);

        if (sport === 'basketball') {
          const { data, error: fnError } = await supabase.functions.invoke('fetch-nba-standings');
          if (fnError) throw fnError;
          if (data?.standings) {
            setNbaStandings(data.standings);
          }
        } else if (sport === 'football') {
          const { data, error: fnError } = await supabase.functions.invoke('fetch-football-standings', {
            body: { league }
          });
          if (fnError) throw fnError;
          if (data?.standings) {
            setFootballStandings(data.standings);
          }
        }
      } catch (err: any) {
        console.error('Error fetching standings:', err);
        setError(err.message || 'Failed to load standings');
      } finally {
        setLoading(false);
      }
    };

    fetchStandings();
  }, [sport, league]);

  if (loading) {
    return (
      <Card className="p-4 bg-card border-border">
        <div className="flex items-center gap-2 mb-4">
          <Trophy className="w-5 h-5 text-accent" />
          <h3 className="font-semibold text-foreground">{league} Standings</h3>
        </div>
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
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
          <h3 className="font-semibold text-foreground">{league} Standings</h3>
        </div>
        <p className="text-sm text-muted-foreground">Unable to load standings</p>
      </Card>
    );
  }

  // NBA Standings
  if (sport === 'basketball' && nbaStandings.length > 0) {
    const highlightedTeamIndex = nbaStandings.findIndex(t => 
      highlightTeam && t.name.toLowerCase().includes(highlightTeam.toLowerCase())
    );
    
    const compactIndices = highlightedTeamIndex !== -1 
      ? getCompactIndices(highlightedTeamIndex, nbaStandings.length)
      : [0, 1, 2, 3, 4]; // Default to top 5 if no team found
    
    const teamsToShow = expanded 
      ? nbaStandings 
      : nbaStandings.filter((_, idx) => compactIndices.includes(idx));

    return (
      <Card className="p-4 bg-card border-border overflow-hidden">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-accent" />
            <h3 className="font-semibold text-foreground">Western Conference</h3>
          </div>
          {highlightedTeamIndex !== -1 && (
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
              {teamsToShow.map((team) => {
                const originalIndex = nbaStandings.findIndex(t => t.teamId === team.teamId);
                const isHighlighted = highlightTeam && team.name.toLowerCase().includes(highlightTeam.toLowerCase());
                const isPlayoffSpot = originalIndex < 6;
                const isPlayInSpot = originalIndex >= 6 && originalIndex < 10;
                
                return (
                  <TableRow 
                    key={team.teamId}
                    className={`border-border transition-colors ${
                      isHighlighted ? 'bg-accent/10 hover:bg-accent/15' : 'hover:bg-muted/50'
                    }`}
                  >
                    <TableCell className="py-2">
                      <span className={`text-xs font-medium ${
                        isPlayoffSpot ? 'text-emerald-500' : 
                        isPlayInSpot ? 'text-yellow-500' : 'text-muted-foreground'
                      }`}>
                        {originalIndex + 1}
                      </span>
                    </TableCell>
                    <TableCell className="py-2">
                      <span className={`font-medium text-sm ${isHighlighted ? 'text-accent' : 'text-foreground'}`}>
                        {team.abbr}
                      </span>
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
                      <span className={`text-xs font-medium ${
                        team.streak.startsWith('W') ? 'text-emerald-500' : 'text-red-500'
                      }`}>
                        {team.streak}
                      </span>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
        
        <div className="mt-3 pt-3 border-t border-border flex items-center justify-between">
          <div className="flex flex-wrap gap-3 text-[10px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              Playoff
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-yellow-500"></span>
              Play-In
            </span>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setExpanded(!expanded)}
            className="text-xs text-muted-foreground hover:text-foreground h-7 px-2"
          >
            {expanded ? (
              <>Show Less <ChevronUp className="w-3 h-3 ml-1" /></>
            ) : (
              <>Full Table <ChevronDown className="w-3 h-3 ml-1" /></>
            )}
          </Button>
        </div>
      </Card>
    );
  }

  // Football Standings
  if (sport === 'football' && footballStandings.length > 0) {
    const highlightedTeamIndex = footballStandings.findIndex(t => 
      highlightTeam && t.teamName.toLowerCase().includes(highlightTeam.toLowerCase())
    );
    
    const compactIndices = highlightedTeamIndex !== -1 
      ? getCompactIndices(highlightedTeamIndex, footballStandings.length)
      : [0, 1, 2, 3, 4]; // Default to top 5 if no team found
    
    const teamsToShow = expanded 
      ? footballStandings 
      : footballStandings.filter((_, idx) => compactIndices.includes(idx));

    return (
      <Card className="p-4 bg-card border-border overflow-hidden">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-accent" />
            <h3 className="font-semibold text-foreground">{league}</h3>
          </div>
          {highlightedTeamIndex !== -1 && (
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
                <TableHead className="text-center text-muted-foreground text-xs">P</TableHead>
                <TableHead className="text-center text-muted-foreground text-xs hidden sm:table-cell">W</TableHead>
                <TableHead className="text-center text-muted-foreground text-xs hidden sm:table-cell">D</TableHead>
                <TableHead className="text-center text-muted-foreground text-xs hidden sm:table-cell">L</TableHead>
                <TableHead className="text-center text-muted-foreground text-xs hidden md:table-cell">GD</TableHead>
                <TableHead className="text-center text-muted-foreground text-xs font-semibold">Pts</TableHead>
                <TableHead className="text-center text-muted-foreground text-xs hidden lg:table-cell">Form</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {teamsToShow.map((team) => {
                const isHighlighted = highlightTeam && team.teamName.toLowerCase().includes(highlightTeam.toLowerCase());
                const isChampionsLeague = team.rank <= 4;
                const isEuropaLeague = team.rank === 5 || team.rank === 6;
                const isRelegation = team.rank > footballStandings.length - 3;
                
                return (
                  <TableRow 
                    key={team.teamId}
                    className={`border-border transition-colors ${
                      isHighlighted ? 'bg-accent/10 hover:bg-accent/15' : 'hover:bg-muted/50'
                    }`}
                  >
                    <TableCell className="py-2">
                      <span className={`text-xs font-medium ${
                        isChampionsLeague ? 'text-blue-500' : 
                        isEuropaLeague ? 'text-orange-500' : 
                        isRelegation ? 'text-red-500' : 'text-muted-foreground'
                      }`}>
                        {team.rank}
                      </span>
                    </TableCell>
                    <TableCell className="py-2">
                      <div className="flex items-center gap-2">
                        <img 
                          src={team.teamLogo} 
                          alt={team.teamName} 
                          className="w-5 h-5 object-contain"
                          onError={(e) => { e.currentTarget.style.display = 'none'; }}
                        />
                        <span className={`font-medium text-sm ${isHighlighted ? 'text-accent' : 'text-foreground'}`}>
                          {team.teamName.length > 15 ? team.teamName.slice(0, 15) + '...' : team.teamName}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center py-2">
                      <span className="text-sm text-muted-foreground">{team.played}</span>
                    </TableCell>
                    <TableCell className="text-center py-2 hidden sm:table-cell">
                      <span className="text-sm text-foreground">{team.wins}</span>
                    </TableCell>
                    <TableCell className="text-center py-2 hidden sm:table-cell">
                      <span className="text-sm text-muted-foreground">{team.draws}</span>
                    </TableCell>
                    <TableCell className="text-center py-2 hidden sm:table-cell">
                      <span className="text-sm text-muted-foreground">{team.losses}</span>
                    </TableCell>
                    <TableCell className="text-center py-2 hidden md:table-cell">
                      <span className={`text-sm ${team.goalDiff > 0 ? 'text-emerald-500' : team.goalDiff < 0 ? 'text-red-500' : 'text-muted-foreground'}`}>
                        {team.goalDiff > 0 ? '+' : ''}{team.goalDiff}
                      </span>
                    </TableCell>
                    <TableCell className="text-center py-2">
                      <span className="text-sm font-semibold text-foreground">{team.points}</span>
                    </TableCell>
                    <TableCell className="text-center py-2 hidden lg:table-cell">
                      <div className="flex justify-center gap-0.5">
                        {team.form.split('').slice(-5).map((result, i) => (
                          <span 
                            key={i}
                            className={`w-4 h-4 rounded-full text-[10px] flex items-center justify-center font-medium text-white ${
                              result === 'W' ? 'bg-emerald-500' : 
                              result === 'D' ? 'bg-yellow-500' : 
                              'bg-red-500'
                            }`}
                          >
                            {result}
                          </span>
                        ))}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
        
        <div className="mt-3 pt-3 border-t border-border flex items-center justify-between">
          <div className="flex flex-wrap gap-3 text-[10px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-blue-500"></span>
              UCL
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-orange-500"></span>
              UEL
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-red-500"></span>
              Rel.
            </span>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setExpanded(!expanded)}
            className="text-xs text-muted-foreground hover:text-foreground h-7 px-2"
          >
            {expanded ? (
              <>Show Less <ChevronUp className="w-3 h-3 ml-1" /></>
            ) : (
              <>Full Table <ChevronDown className="w-3 h-3 ml-1" /></>
            )}
          </Button>
        </div>
      </Card>
    );
  }

  return null;
};

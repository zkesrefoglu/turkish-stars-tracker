import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

interface PreviousGameData {
  date: string;
  opponent: string;
  result: string;
  homeScore: number;
  awayScore: number;
  isHome: boolean;
  isWin: boolean;
  stats: {
    points: number;
    rebounds: number;
    assists: number;
    plusMinus?: number;
    minutes?: number;
    steals?: number;
    blocks?: number;
    fg?: string;
    threeP?: string;
    ft?: string;
  };
}

interface PreviousGameCardProps {
  game: PreviousGameData;
  teamName?: string;
  teamLogo?: string;
}

// Get team abbreviation from full team name
const getTeamAbbr = (teamName: string): string => {
  const abbrevMap: Record<string, string> = {
    'Houston Rockets': 'HOU',
    'Los Angeles Lakers': 'LAL',
    'Denver Nuggets': 'DEN',
    'Golden State Warriors': 'GSW',
    'Boston Celtics': 'BOS',
    'Miami Heat': 'MIA',
    'Phoenix Suns': 'PHX',
    'Milwaukee Bucks': 'MIL',
    'Dallas Mavericks': 'DAL',
    'Philadelphia 76ers': 'PHI',
  };
  return abbrevMap[teamName] || teamName.split(' ').pop()?.substring(0, 3).toUpperCase() || 'TM';
};

export const PreviousGameCard = ({ game, teamName = "Team", teamLogo }: PreviousGameCardProps) => {
  const teamAbbr = getTeamAbbr(teamName);
  const getStatColor = (value: number, type: 'pts' | 'reb' | 'ast' | 'plusMinus') => {
    if (type === 'plusMinus') {
      if (value > 10) return 'bg-emerald-500 text-white';
      if (value > 0) return 'bg-emerald-400 text-white';
      if (value < -10) return 'bg-red-500 text-white';
      if (value < 0) return 'bg-red-400 text-white';
      return 'bg-muted text-foreground';
    }
    
    // Color based on value thresholds
    if (type === 'pts') {
      if (value >= 30) return 'bg-accent text-accent-foreground';
      if (value >= 20) return 'bg-primary text-primary-foreground';
      return 'bg-secondary text-secondary-foreground';
    }
    
    if (type === 'reb' || type === 'ast') {
      if (value >= 10) return 'bg-primary text-primary-foreground';
      return 'bg-secondary text-secondary-foreground';
    }
    
    return 'bg-secondary text-secondary-foreground';
  };

  return (
    <Card className="p-4 bg-card border-border overflow-hidden">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Previous Game</h3>
        <Badge variant={game.isWin ? "default" : "destructive"} className="text-xs">
          {game.isWin ? "WIN" : "LOSS"}
        </Badge>
      </div>
      
      {/* Score Section */}
      <div className="flex items-center justify-center gap-4 mb-4 py-3 bg-secondary/50 rounded-lg">
        <div className="text-center">
          <div className="text-xs text-muted-foreground mb-1">
            {game.isHome ? teamAbbr : game.opponent}
          </div>
        <div className={`text-2xl font-bold ${game.isHome ? 'text-accent' : 'text-muted-foreground'}`}>
          {game.homeScore}
        </div>
      </div>
      
      <div className="text-muted-foreground text-sm">@</div>
      
      <div className="text-center">
        <div className="text-xs text-muted-foreground mb-1">
          {game.isHome ? game.opponent : teamAbbr}
        </div>
        <div className={`text-2xl font-bold ${!game.isHome ? 'text-accent' : 'text-muted-foreground'}`}>
          {game.awayScore}
        </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-4 gap-2">
        <div className={`text-center p-3 rounded-lg ${getStatColor(game.stats.points, 'pts')}`}>
          <div className="text-2xl font-bold">{game.stats.points}</div>
          <div className="text-xs opacity-80">PTS</div>
        </div>
        <div className={`text-center p-3 rounded-lg ${getStatColor(game.stats.rebounds, 'reb')}`}>
          <div className="text-2xl font-bold">{game.stats.rebounds}</div>
          <div className="text-xs opacity-80">REB</div>
        </div>
        <div className={`text-center p-3 rounded-lg ${getStatColor(game.stats.assists, 'ast')}`}>
          <div className="text-2xl font-bold">{game.stats.assists}</div>
          <div className="text-xs opacity-80">AST</div>
        </div>
        {game.stats.plusMinus !== undefined && (
          <div className={`text-center p-3 rounded-lg ${getStatColor(game.stats.plusMinus, 'plusMinus')}`}>
            <div className="text-2xl font-bold">
              {game.stats.plusMinus > 0 ? '+' : ''}{game.stats.plusMinus}
            </div>
            <div className="text-xs opacity-80">+/-</div>
          </div>
        )}
      </div>

      {/* Additional Stats */}
      {(game.stats.minutes || game.stats.fg || game.stats.steals !== undefined) && (
        <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-border">
          {game.stats.minutes && (
            <Badge variant="outline" className="text-xs">
              {game.stats.minutes} MIN
            </Badge>
          )}
          {game.stats.fg && (
            <Badge variant="outline" className="text-xs">
              FG: {game.stats.fg}
            </Badge>
          )}
          {game.stats.threeP && (
            <Badge variant="outline" className="text-xs">
              3P: {game.stats.threeP}
            </Badge>
          )}
          {game.stats.ft && (
            <Badge variant="outline" className="text-xs">
              FT: {game.stats.ft}
            </Badge>
          )}
          {game.stats.steals !== undefined && game.stats.steals > 0 && (
            <Badge variant="outline" className="text-xs">
              {game.stats.steals} STL
            </Badge>
          )}
          {game.stats.blocks !== undefined && game.stats.blocks > 0 && (
            <Badge variant="outline" className="text-xs">
              {game.stats.blocks} BLK
            </Badge>
          )}
        </div>
      )}

      {/* Date */}
      <div className="text-xs text-muted-foreground mt-3 text-center">
        {format(new Date(game.date), "EEEE, MMM d, yyyy")}
      </div>
    </Card>
  );
};

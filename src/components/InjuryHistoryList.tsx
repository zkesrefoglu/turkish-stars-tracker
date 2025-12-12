import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Calendar, Clock } from "lucide-react";

interface Injury {
  id: string;
  athlete_id: string;
  injury_type: string;
  injury_zone: string | null;
  start_date: string;
  end_date: string | null;
  days_missed: number | null;
  games_missed: number | null;
  is_current: boolean | null;
  severity: string | null;
  description: string | null;
}

interface InjuryHistoryListProps {
  injuries: Injury[];
}

const getSeverityBadge = (severity: string | null) => {
  switch (severity) {
    case 'major':
      return 'bg-red-100 text-red-700 border-red-300';
    case 'moderate':
      return 'bg-orange-100 text-orange-700 border-orange-300';
    case 'minor':
      return 'bg-yellow-100 text-yellow-700 border-yellow-300';
    default:
      return 'bg-muted text-muted-foreground border-border';
  }
};

const getZoneBadge = (zone: string | null) => {
  switch (zone) {
    case 'Lower Body':
      return 'bg-blue-100 text-blue-700 border-blue-300';
    case 'Upper Body':
      return 'bg-purple-100 text-purple-700 border-purple-300';
    case 'Head':
      return 'bg-red-100 text-red-700 border-red-300';
    default:
      return 'bg-secondary text-secondary-foreground border-border';
  }
};

export const InjuryHistoryList = ({ injuries }: InjuryHistoryListProps) => {
  if (injuries.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No injury history recorded.
      </div>
    );
  }

  // Sort by date descending
  const sortedInjuries = [...injuries].sort(
    (a, b) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime()
  );

  // Calculate totals
  const totalDaysMissed = injuries.reduce((sum, inj) => sum + (inj.days_missed || 0), 0);
  const totalGamesMissed = injuries.reduce((sum, inj) => sum + (inj.games_missed || 0), 0);

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-4 p-4 bg-secondary/50 rounded-lg">
        <div className="text-center">
          <div className="text-2xl font-bold text-foreground">{injuries.length}</div>
          <div className="text-xs text-muted-foreground">Total Injuries</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-foreground">{totalDaysMissed}</div>
          <div className="text-xs text-muted-foreground">Days Missed</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-foreground">{totalGamesMissed || '—'}</div>
          <div className="text-xs text-muted-foreground">Games Missed</div>
        </div>
      </div>

      {/* Injury List */}
      <div className="space-y-3">
        {sortedInjuries.map((injury) => (
          <div 
            key={injury.id} 
            className={`p-4 rounded-lg border ${injury.is_current ? 'bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-800' : 'bg-card border-border'}`}
          >
            <div className="flex items-start justify-between gap-4 mb-2">
              <div className="flex items-center gap-2">
                <AlertTriangle className={`w-4 h-4 ${injury.is_current ? 'text-red-500' : 'text-muted-foreground'}`} />
                <span className="font-semibold text-foreground">{injury.injury_type}</span>
                {injury.is_current && (
                  <Badge className="bg-red-100 text-red-700 border-red-300 text-xs">
                    Current
                  </Badge>
                )}
              </div>
              <div className="flex gap-2">
                {injury.injury_zone && (
                  <Badge className={`${getZoneBadge(injury.injury_zone)} border text-xs`}>
                    {injury.injury_zone}
                  </Badge>
                )}
                {injury.severity && (
                  <Badge className={`${getSeverityBadge(injury.severity)} border text-xs capitalize`}>
                    {injury.severity}
                  </Badge>
                )}
              </div>
            </div>
            
            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                <span>{format(new Date(injury.start_date), "MMM d, yyyy")}</span>
                {injury.end_date && (
                  <span> — {format(new Date(injury.end_date), "MMM d, yyyy")}</span>
                )}
              </div>
              
              {injury.days_missed && (
                <div className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  <span>{injury.days_missed} days</span>
                </div>
              )}
              
              {injury.games_missed && (
                <span className="text-accent font-medium">{injury.games_missed} games missed</span>
              )}
            </div>
            
            {injury.description && (
              <p className="mt-2 text-sm text-muted-foreground">{injury.description}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

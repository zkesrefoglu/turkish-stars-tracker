import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { format, isToday, isTomorrow, addDays } from 'date-fns';
import { CaretRight, SoccerBall } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { getCompetitionLogo } from '@/lib/competitionLogos';

interface UpcomingMatch {
  id: string;
  athlete_id: string;
  match_date: string;
  opponent: string;
  competition: string;
  home_away: string | null;
  athlete?: {
    name: string;
    slug: string;
    photo_url: string | null;
    team: string;
    sport: string;
  };
}

export const TodaysMatchesCarousel = () => {
  const [matches, setMatches] = useState<UpcomingMatch[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMatches = async () => {
      const now = new Date();
      const endDate = addDays(now, 2);

      const { data } = await supabase
        .from('athlete_upcoming_matches')
        .select(`
          *,
          athlete:athlete_profiles!athlete_id (
            name,
            slug,
            photo_url,
            team,
            sport
          )
        `)
        .gte('match_date', now.toISOString())
        .lte('match_date', endDate.toISOString())
        .order('match_date', { ascending: true });

      if (data) {
        setMatches(data.map(m => ({
          ...m,
          athlete: Array.isArray(m.athlete) ? m.athlete[0] : m.athlete
        })));
      }
      setLoading(false);
    };

    fetchMatches();
  }, []);

  if (loading) {
    return (
      <div className="px-4 py-6">
        <div className="flex gap-3 overflow-x-auto scrollbar-hide">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex-shrink-0 w-44 h-48 bg-muted rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (matches.length === 0) {
    return (
      <div className="px-4 py-6">
        <p className="text-muted-foreground text-sm text-center">No upcoming matches in the next 48 hours</p>
      </div>
    );
  }

  const getDateLabel = (date: Date) => {
    if (isToday(date)) return 'Today';
    if (isTomorrow(date)) return 'Tomorrow';
    return format(date, 'EEE');
  };

  return (
    <div className="py-4">
      {/* Header */}
      <div className="flex items-center justify-between px-4 mb-3">
        <h2 className="font-headline text-lg font-bold text-foreground">Upcoming Matches</h2>
        <Link to="/athletes" className="flex items-center gap-1 text-xs text-accent font-medium">
          See all <CaretRight size={16} weight="bold" />
        </Link>
      </div>

      {/* Carousel - grid on mobile for no overlap, horizontal scroll on larger screens */}
      <div className="grid grid-cols-2 gap-3 px-4 sm:flex sm:overflow-x-auto sm:scrollbar-hide sm:pb-2 sm:snap-x sm:snap-mandatory sm:scroll-pl-4">
        {matches.map((match) => {
          const matchDate = new Date(match.match_date);
          const athlete = match.athlete;
          const compLogo = getCompetitionLogo(match.competition);

          return (
            <Link
              key={match.id}
              to={athlete ? `/athlete/${athlete.slug}` : '#'}
              className="sm:flex-shrink-0 sm:snap-start sm:w-48"
            >
              <div className="h-full bg-card border border-border rounded-xl overflow-hidden hover:border-accent/40 transition-all duration-300 hover:shadow-lg hover:shadow-accent/10 flex flex-col">
                {/* Player Image - Fixed aspect ratio */}
                <div className="relative aspect-[4/3] bg-gradient-to-br from-muted to-background overflow-hidden">
                  {athlete?.photo_url ? (
                    <img 
                      src={athlete.photo_url} 
                      alt={athlete.name}
                      className="w-full h-full object-cover object-top"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <SoccerBall size={40} weight="duotone" className="text-muted-foreground" />
                    </div>
                  )}
                  {/* Date badge */}
                  <div className={cn(
                    "absolute top-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase",
                    isToday(matchDate) 
                      ? "bg-accent text-white" 
                      : "bg-background/90 text-foreground"
                  )}>
                    {getDateLabel(matchDate)}
                  </div>
                  {/* Competition logo */}
                  {compLogo && (
                    <img 
                      src={compLogo} 
                      alt={match.competition}
                      className="absolute top-2 right-2 w-6 h-6 object-contain bg-background/80 rounded-md p-0.5"
                    />
                  )}
                </div>

                {/* Match Info - Fixed height with consistent spacing */}
                <div className="p-3 flex-1 flex flex-col justify-between min-h-[88px]">
                  <div>
                    <p className="font-bold text-sm text-foreground truncate leading-tight">
                      {athlete?.name || 'Unknown'}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1 truncate">
                      {match.home_away === 'home' ? 'vs' : '@'} {match.opponent}
                    </p>
                  </div>
                  <p className="text-xs text-accent font-semibold mt-2">
                    {format(matchDate, 'h:mm a')}
                  </p>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
};

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Header } from "@/components/Header";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, AlertTriangle, Calendar, TrendingUp, ExternalLink, User } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format, isWithinInterval, addHours } from "date-fns";

interface AthleteProfile {
  id: string;
  name: string;
  slug: string;
  sport: string;
  team: string;
  league: string;
  photo_url: string | null;
  position: string;
  jersey_number: number | null;
}

interface DailyUpdate {
  id: string;
  athlete_id: string;
  date: string;
  played: boolean;
  match_result: string | null;
  opponent: string | null;
  competition: string | null;
  home_away: string | null;
  stats: any;
  rating: number | null;
  minutes_played: number | null;
  injury_status: string;
  injury_details: string | null;
}

interface TransferRumor {
  id: string;
  athlete_id: string;
  rumor_date: string;
  headline: string;
  summary: string | null;
  source: string | null;
  source_url: string | null;
  reliability: string;
  status: string;
}

interface UpcomingMatch {
  id: string;
  athlete_id: string;
  match_date: string;
  opponent: string;
  competition: string;
  home_away: string | null;
}

const TurkishStars = () => {
  const [athletes, setAthletes] = useState<AthleteProfile[]>([]);
  const [dailyUpdates, setDailyUpdates] = useState<DailyUpdate[]>([]);
  const [transferRumors, setTransferRumors] = useState<TransferRumor[]>([]);
  const [upcomingMatches, setUpcomingMatches] = useState<UpcomingMatch[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [athletesRes, updatesRes, rumorsRes, matchesRes] = await Promise.all([
          supabase.from("athlete_profiles").select("*").order("name"),
          supabase.from("athlete_daily_updates").select("*").order("date", { ascending: false }),
          supabase.from("athlete_transfer_rumors").select("*").eq("status", "active").order("rumor_date", { ascending: false }),
          supabase.from("athlete_upcoming_matches").select("*").order("match_date"),
        ]);

        if (athletesRes.data) setAthletes(athletesRes.data);
        if (updatesRes.data) setDailyUpdates(updatesRes.data);
        if (rumorsRes.data) setTransferRumors(rumorsRes.data);
        if (matchesRes.data) setUpcomingMatches(matchesRes.data);
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Get latest update for an athlete
  const getLatestUpdate = (athleteId: string): DailyUpdate | undefined => {
    return dailyUpdates.find((u) => u.athlete_id === athleteId);
  };

  // Get last played match for an athlete
  const getLastMatch = (athleteId: string): DailyUpdate | undefined => {
    return dailyUpdates.find((u) => u.athlete_id === athleteId && u.played);
  };

  // Get next match for an athlete
  const getNextMatch = (athleteId: string): UpcomingMatch | undefined => {
    const now = new Date();
    return upcomingMatches.find(
      (m) => m.athlete_id === athleteId && new Date(m.match_date) > now
    );
  };

  // Get athlete by ID
  const getAthlete = (athleteId: string): AthleteProfile | undefined => {
    return athletes.find((a) => a.id === athleteId);
  };

  // Filter alerts
  const injuryAlerts = dailyUpdates.filter(
    (u) => u.injury_status !== "healthy" && athletes.find((a) => a.id === u.athlete_id)
  );

  const topRumors = transferRumors.filter(
    (r) => r.reliability === "tier_1" || r.reliability === "tier_2"
  );

  // Filter upcoming matches in next 48 hours
  const next48Hours = upcomingMatches.filter((m) => {
    const matchDate = new Date(m.match_date);
    const now = new Date();
    return isWithinInterval(matchDate, { start: now, end: addHours(now, 48) });
  });

  const getInjuryColor = (status: string) => {
    switch (status) {
      case "healthy": return "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";
      case "questionable": return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
      case "doubtful": return "bg-orange-500/20 text-orange-400 border-orange-500/30";
      case "out": return "bg-red-500/20 text-red-400 border-red-500/30";
      default: return "bg-gray-500/20 text-gray-400 border-gray-500/30";
    }
  };

  const getReliabilityBadge = (reliability: string) => {
    switch (reliability) {
      case "tier_1": return "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";
      case "tier_2": return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
      case "tier_3": return "bg-orange-500/20 text-orange-400 border-orange-500/30";
      case "speculation": return "bg-gray-500/20 text-gray-400 border-gray-500/30";
      default: return "bg-gray-500/20 text-gray-400 border-gray-500/30";
    }
  };

  const formatStats = (athlete: AthleteProfile, stats: any) => {
    if (!stats || typeof stats !== 'object' || Object.keys(stats).length === 0) return "—";
    
    if (athlete.sport === "basketball") {
      const pts = stats.points ?? stats.pts ?? "—";
      const reb = stats.rebounds ?? stats.reb ?? "—";
      const ast = stats.assists ?? stats.ast ?? "—";
      return `${pts}/${reb}/${ast}`;
    } else {
      const goals = stats.goals ?? 0;
      const assists = stats.assists ?? 0;
      return `${goals}G/${assists}A`;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <div className="text-center py-16 text-gray-400">Loading...</div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100">
      <Header />
      
      <main className="container mx-auto px-4 py-6 max-w-7xl">
        <Link to="/section/sports" className="inline-flex items-center text-sm text-gray-400 hover:text-red-400 mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Sports
        </Link>

        {/* HEADER */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <h1 className="text-3xl md:text-4xl font-bold flex items-center gap-3">
            <span className="text-4xl">🇹🇷</span>
            <span className="bg-gradient-to-r from-red-500 to-red-400 bg-clip-text text-transparent">
              Turkish Stars Tracker
            </span>
          </h1>
          <div className="text-gray-400 text-sm font-ui uppercase tracking-wider">
            {format(new Date(), "EEEE, MMMM d, yyyy")}
          </div>
        </div>

        {/* ALERTS SECTION */}
        {(injuryAlerts.length > 0 || topRumors.length > 0) && (
          <div className="mb-8 space-y-3">
            {injuryAlerts.map((alert) => {
              const athlete = getAthlete(alert.athlete_id);
              if (!athlete) return null;
              return (
                <div
                  key={alert.id}
                  className="flex items-center gap-3 p-4 rounded-lg bg-red-950/50 border border-red-500/30"
                >
                  <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0" />
                  <div className="flex-1">
                    <span className="font-semibold text-red-400">{athlete.name}</span>
                    <span className="text-gray-300 mx-2">—</span>
                    <span className="text-gray-400 capitalize">{alert.injury_status}</span>
                    {alert.injury_details && (
                      <span className="text-gray-500 ml-2">({alert.injury_details})</span>
                    )}
                  </div>
                </div>
              );
            })}
            
            {topRumors.map((rumor) => {
              const athlete = getAthlete(rumor.athlete_id);
              if (!athlete) return null;
              return (
                <div
                  key={rumor.id}
                  className="flex items-center gap-3 p-4 rounded-lg bg-orange-950/40 border border-orange-500/30"
                >
                  <TrendingUp className="w-5 h-5 text-orange-400 flex-shrink-0" />
                  <div className="flex-1">
                    <span className="font-semibold text-orange-400">{athlete.name}</span>
                    <span className="text-gray-300 mx-2">—</span>
                    <span className="text-gray-300">{rumor.headline}</span>
                    <Badge className={`ml-2 ${getReliabilityBadge(rumor.reliability)} text-xs`}>
                      {rumor.reliability.replace("_", " ")}
                    </Badge>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* MAIN TABLE */}
        <Card className="mb-8 bg-gray-800/50 border-gray-700/50 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-700/50 bg-gray-800/80">
                  <th className="text-left p-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Player</th>
                  <th className="text-left p-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Status</th>
                  <th className="text-left p-4 text-xs font-semibold text-gray-400 uppercase tracking-wider hidden md:table-cell">Last Match</th>
                  <th className="text-left p-4 text-xs font-semibold text-gray-400 uppercase tracking-wider hidden lg:table-cell">Performance</th>
                  <th className="text-left p-4 text-xs font-semibold text-gray-400 uppercase tracking-wider hidden sm:table-cell">Next Up</th>
                  <th className="text-left p-4 text-xs font-semibold text-gray-400 uppercase tracking-wider w-12"></th>
                </tr>
              </thead>
              <tbody>
                {athletes.map((athlete) => {
                  const latestUpdate = getLatestUpdate(athlete.id);
                  const lastMatch = getLastMatch(athlete.id);
                  const nextMatch = getNextMatch(athlete.id);
                  const injuryStatus = latestUpdate?.injury_status || "healthy";

                  return (
                    <tr key={athlete.id} className="border-b border-gray-700/30 hover:bg-gray-800/40 transition-colors">
                      {/* Player */}
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="relative w-12 h-12 rounded-full bg-gray-700 flex items-center justify-center overflow-hidden border-2 border-gray-600">
                            {athlete.photo_url ? (
                              <img src={athlete.photo_url} alt={athlete.name} className="w-full h-full object-cover" />
                            ) : (
                              <User className="w-6 h-6 text-gray-500" />
                            )}
                            {athlete.jersey_number && (
                              <div className="absolute -bottom-1 -right-1 bg-red-500 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
                                {athlete.jersey_number}
                              </div>
                            )}
                          </div>
                          <div>
                            <div className="font-semibold text-gray-100">{athlete.name}</div>
                            <div className="text-sm text-gray-400">{athlete.team}</div>
                            <div className="text-xs text-gray-500">{athlete.position}</div>
                          </div>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="p-4">
                        <Badge className={`${getInjuryColor(injuryStatus)} border capitalize`}>
                          {injuryStatus}
                        </Badge>
                      </td>

                      {/* Last Match */}
                      <td className="p-4 hidden md:table-cell">
                        {lastMatch ? (
                          <div>
                            <div className="font-medium text-gray-200">{lastMatch.match_result || "—"}</div>
                            <div className="text-sm text-gray-400">
                              {lastMatch.home_away === "home" ? "vs" : "@"} {lastMatch.opponent}
                            </div>
                          </div>
                        ) : (
                          <span className="text-gray-500">—</span>
                        )}
                      </td>

                      {/* Performance */}
                      <td className="p-4 hidden lg:table-cell">
                        {lastMatch ? (
                          <div>
                            <div className="font-mono text-gray-200">
                              {formatStats(athlete, lastMatch.stats)}
                            </div>
                            {athlete.sport === "football" && lastMatch.rating && (
                              <div className="text-sm text-yellow-400">{lastMatch.rating.toFixed(1)} rating</div>
                            )}
                            {lastMatch.minutes_played && (
                              <div className="text-xs text-gray-500">{lastMatch.minutes_played}'</div>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-500">—</span>
                        )}
                      </td>

                      {/* Next Up */}
                      <td className="p-4 hidden sm:table-cell">
                        {nextMatch ? (
                          <div>
                            <div className="font-medium text-gray-200">
                              {nextMatch.home_away === "home" ? "vs" : "@"} {nextMatch.opponent}
                            </div>
                            <div className="text-sm text-gray-400">{nextMatch.competition}</div>
                            <div className="text-xs text-gray-500">
                              {format(new Date(nextMatch.match_date), "MMM d, h:mm a")}
                            </div>
                          </div>
                        ) : (
                          <span className="text-gray-500">—</span>
                        )}
                      </td>

                      {/* Link */}
                      <td className="p-4">
                        <Link
                          to={`/section/sports/turkish-stars/${athlete.slug}`}
                          className="text-red-400 hover:text-red-300 transition-colors"
                        >
                          <ExternalLink className="w-5 h-5" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* TRANSFER RUMORS */}
          <Card className="bg-gray-800/50 border-gray-700/50 p-6">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-red-400" />
              Transfer Rumors
            </h2>
            
            {transferRumors.length > 0 ? (
              <div className="space-y-4">
                {transferRumors.slice(0, 5).map((rumor) => {
                  const athlete = getAthlete(rumor.athlete_id);
                  if (!athlete) return null;
                  
                  return (
                    <div key={rumor.id} className="border-b border-gray-700/30 pb-4 last:border-0 last:pb-0">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <span className="text-sm font-medium text-red-400">{athlete.name}</span>
                        <Badge className={`${getReliabilityBadge(rumor.reliability)} border text-xs`}>
                          {rumor.reliability.replace("_", " ")}
                        </Badge>
                      </div>
                      <p className="text-gray-200 text-sm mb-2">{rumor.headline}</p>
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span>{rumor.source || "Unknown source"}</span>
                        <span>{format(new Date(rumor.rumor_date), "MMM d")}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-gray-500 text-sm">No active transfer rumors</p>
            )}
          </Card>

          {/* UPCOMING FIXTURES */}
          <Card className="bg-gray-800/50 border-gray-700/50 p-6">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-red-400" />
              Upcoming (48h)
            </h2>
            
            {next48Hours.length > 0 ? (
              <div className="space-y-3">
                {next48Hours.map((match) => {
                  const athlete = getAthlete(match.athlete_id);
                  if (!athlete) return null;
                  
                  return (
                    <div key={match.id} className="flex items-center gap-4 p-3 rounded-lg bg-gray-700/30">
                      <div className="flex-1">
                        <div className="font-medium text-gray-200">{athlete.name}</div>
                        <div className="text-sm text-gray-400">
                          {match.home_away === "home" ? "vs" : "@"} {match.opponent}
                        </div>
                        <div className="text-xs text-gray-500">{match.competition}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium text-red-400">
                          {format(new Date(match.match_date), "MMM d")}
                        </div>
                        <div className="text-xs text-gray-400">
                          {format(new Date(match.match_date), "h:mm a")}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-gray-500 text-sm">No matches in the next 48 hours</p>
            )}
          </Card>
        </div>
      </main>
    </div>
  );
};

export default TurkishStars;
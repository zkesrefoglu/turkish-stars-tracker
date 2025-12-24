import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-webhook-secret',
};

// Team IDs in API-Football
const TEAM_IDS: Record<string, number> = {
  'Real Madrid': 541,
  'Juventus': 496,
  'Brighton': 51,
  'Brighton & Hove Albion': 51,
  'Lille': 79,
  'Eintracht Frankfurt': 169,
  'Udinese': 494,
  'Inter Milan': 505,
  'Inter': 505,
  'Cagliari': 490,
  'Bournemouth': 35,
  'AS Roma': 497,
  'Al-Ahli': 2932,
  'Al Ahli': 2932,
  'Al-Hilal': 2939,
  'Al Hilal': 2939,
  'Manchester United': 33,
  'Man United': 33,
  'VfB Stuttgart': 157,
  'Stuttgart': 157,
  'Borussia Dortmund': 165,
  'Dortmund': 165,
  'FC Porto': 212,
  'Porto': 212,
  'Pisa': 520,
  'Torino': 503,
  'Torino FC': 503,
};

interface AthleteProfile {
  id: string;
  name: string;
  team: string;
  sport: string;
  api_football_id: number | null;
}

async function fetchApiFootball(endpoint: string, apiKey: string): Promise<any> {
  const url = `https://v3.football.api-sports.io${endpoint}`;
  console.log(`Fetching: ${url}`);
  
  const response = await fetch(url, {
    headers: {
      'x-apisports-key': apiKey,
    },
  });

  if (!response.ok) {
    console.error(`API-Football error: ${response.status} ${response.statusText}`);
    return null;
  }

  const data = await response.json();
  return data;
}

function matchPlayerName(apiName: string, athleteName: string): boolean {
  const normalize = (name: string) => 
    name.toLowerCase()
      .replace(/[ğ]/g, 'g')
      .replace(/[ü]/g, 'u')
      .replace(/[ş]/g, 's')
      .replace(/[ı]/g, 'i')
      .replace(/[ö]/g, 'o')
      .replace(/[ç]/g, 'c')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');

  const apiNorm = normalize(apiName);
  const athleteNorm = normalize(athleteName);
  
  // Check if either name contains the other, or if last names match
  const apiParts = apiNorm.split(' ');
  const athleteParts = athleteNorm.split(' ');
  
  return apiNorm.includes(athleteNorm) || 
         athleteNorm.includes(apiNorm) ||
         apiParts.some(p => athleteParts.includes(p) && p.length > 3);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate authorization - allow either webhook secret OR valid auth header
    const webhookSecret = req.headers.get('x-webhook-secret');
    const expectedSecret = Deno.env.get('STATS_WEBHOOK_SECRET');
    const authHeader = req.headers.get('authorization');
    
    // Check if webhook secret matches OR if there's a valid auth header
    const hasValidWebhookSecret = expectedSecret && webhookSecret === expectedSecret;
    const hasAuthHeader = authHeader && authHeader.startsWith('Bearer ');
    
    if (!hasValidWebhookSecret && !hasAuthHeader) {
      console.error('Unauthorized: Invalid or missing webhook secret and no auth header');
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // ========== SMART SCHEDULING CHECK ==========
    // Check if any matches are happening within a 3-hour window before making API calls
    const now = new Date();
    const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
    const oneHourAhead = new Date(now.getTime() + 1 * 60 * 60 * 1000);
    
    const { data: upcomingMatches, error: scheduleError } = await supabase
      .from('athlete_upcoming_matches')
      .select('id, match_date, athlete_id, opponent, competition')
      .gte('match_date', twoHoursAgo.toISOString())
      .lte('match_date', oneHourAhead.toISOString());

    if (scheduleError) {
      console.error('Error checking schedule:', scheduleError);
      // Continue anyway in case of schedule error
    }

    if (!upcomingMatches || upcomingMatches.length === 0) {
      console.log('No matches scheduled in current time window - skipping API calls');
      console.log(`Checked window: ${twoHoursAgo.toISOString()} to ${oneHourAhead.toISOString()}`);
      return new Response(JSON.stringify({ 
        success: true, 
        skipped: true,
        reason: 'No matches scheduled in current time window',
        checkedWindow: {
          from: twoHoursAgo.toISOString(),
          to: oneHourAhead.toISOString()
        }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Found ${upcomingMatches.length} matches in current window - proceeding with API calls`);
    // ========== END SMART SCHEDULING CHECK ==========

    const apiKey = Deno.env.get('API_FOOTBALL_KEY');
    if (!apiKey) {
      throw new Error('API_FOOTBALL_KEY not configured');
    }

    // Get football athletes
    const { data: athletes, error: athletesError } = await supabase
      .from('athlete_profiles')
      .select('id, name, team, sport, api_football_id')
      .eq('sport', 'football');

    if (athletesError) {
      throw new Error(`Failed to fetch athletes: ${athletesError.message}`);
    }

    console.log(`Found ${athletes?.length || 0} football athletes to check`);

    // Get live fixtures for all our teams
    const teamIds = [...new Set(athletes?.map(a => TEAM_IDS[a.team]).filter(Boolean))];
    console.log(`Checking live matches for team IDs: ${teamIds.join(', ')}`);

    // Fetch all currently live fixtures
    const liveData = await fetchApiFootball('/fixtures?live=all', apiKey);
    
    if (!liveData?.response) {
      console.log('No live fixtures data returned');
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'No live data available',
        liveMatches: 0 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Found ${liveData.response.length} total live fixtures`);

    // Filter to only our teams' matches
    const relevantFixtures = liveData.response.filter((fixture: any) => {
      const homeId = fixture.teams?.home?.id;
      const awayId = fixture.teams?.away?.id;
      return teamIds.includes(homeId) || teamIds.includes(awayId);
    });

    console.log(`Found ${relevantFixtures.length} relevant live fixtures for our teams`);

    const processedMatches: any[] = [];

    for (const fixture of relevantFixtures) {
      const fixtureId = fixture.fixture.id;
      const homeTeam = fixture.teams.home;
      const awayTeam = fixture.teams.away;
      const matchStatus = fixture.fixture.status.short;
      const currentMinute = fixture.fixture.status.elapsed || 0;

      console.log(`Processing fixture ${fixtureId}: ${homeTeam.name} vs ${awayTeam.name} (${matchStatus}, ${currentMinute}')`);

      // Map API status to our status
      let ourStatus = 'scheduled';
      if (['1H', '2H', 'ET', 'P'].includes(matchStatus)) {
        ourStatus = 'live';
      } else if (matchStatus === 'HT') {
        ourStatus = 'halftime';
      } else if (['FT', 'AET', 'PEN'].includes(matchStatus)) {
        ourStatus = 'finished';
      }

      // Determine which of our teams is playing
      const isHomeTeamOurs = teamIds.includes(homeTeam.id);
      const ourTeamId = isHomeTeamOurs ? homeTeam.id : awayTeam.id;
      const ourTeamName = isHomeTeamOurs ? homeTeam.name : awayTeam.name;
      const opponentName = isHomeTeamOurs ? awayTeam.name : homeTeam.name;

      // Find athletes on this team
      const teamAthletes = athletes?.filter(a => TEAM_IDS[a.team] === ourTeamId) || [];
      
      if (teamAthletes.length === 0) {
        console.log(`No tracked athletes for team ${ourTeamName}`);
        continue;
      }

      // Fetch player statistics for this fixture
      let playerStats: any = null;
      if (ourStatus === 'live' || ourStatus === 'halftime') {
        const statsData = await fetchApiFootball(`/fixtures/players?fixture=${fixtureId}`, apiKey);
        if (statsData?.response) {
          // Find our team's player data
          const teamStats = statsData.response.find((t: any) => t.team.id === ourTeamId);
          if (teamStats) {
            playerStats = teamStats.players;
          }
        }
      }

      // Fetch events for last event display
      let lastEvent: string | null = null;
      const eventsData = await fetchApiFootball(`/fixtures/events?fixture=${fixtureId}`, apiKey);
      if (eventsData?.response?.length > 0) {
        const events = eventsData.response;
        const recentEvent = events[events.length - 1];
        if (recentEvent) {
          const eventType = recentEvent.type;
          const playerName = recentEvent.player?.name || 'Unknown';
          const minute = recentEvent.time?.elapsed || '';
          
          if (eventType === 'Goal') {
            lastEvent = `⚽ Goal! ${playerName} (${minute}')`;
          } else if (eventType === 'Card') {
            const cardType = recentEvent.detail === 'Yellow Card' ? '🟨' : '🟥';
            lastEvent = `${cardType} ${playerName} (${minute}')`;
          } else if (eventType === 'subst') {
            lastEvent = `🔄 ${playerName} substituted (${minute}')`;
          }
        }
      }

      // Process each tracked athlete
      for (const athlete of teamAthletes) {
        let athleteStats: Record<string, any> = {};
        
        if (playerStats) {
          // Find this player's stats
          const playerData = playerStats.find((p: any) => {
            if (athlete.api_football_id && p.player.id === athlete.api_football_id) {
              return true;
            }
            return matchPlayerName(p.player.name, athlete.name);
          });

          if (playerData) {
            const stats = playerData.statistics?.[0];
            if (stats) {
              athleteStats = {
                minutes: stats.games?.minutes || 0,
                rating: stats.games?.rating ? parseFloat(stats.games.rating) : null,
                goals: stats.goals?.total || 0,
                assists: stats.goals?.assists || 0,
                shots: stats.shots?.total || 0,
                shotsOnTarget: stats.shots?.on || 0,
                passes: stats.passes?.total || 0,
                passAccuracy: stats.passes?.accuracy || 0,
                tackles: stats.tackles?.total || 0,
                interceptions: stats.tackles?.interceptions || 0,
                duelsWon: stats.duels?.won || 0,
                dribbles: stats.dribbles?.success || 0,
                foulsCommitted: stats.fouls?.committed || 0,
                foulsDrawn: stats.fouls?.drawn || 0,
                yellowCards: stats.cards?.yellow || 0,
                redCards: stats.cards?.red || 0,
              };
            }
          }
        }

        const matchData = {
          athlete_id: athlete.id,
          opponent: opponentName,
          competition: fixture.league?.name || 'Unknown',
          home_away: isHomeTeamOurs ? 'home' : 'away',
          match_status: ourStatus,
          kickoff_time: fixture.fixture.date,
          current_minute: currentMinute,
          home_score: fixture.goals.home || 0,
          away_score: fixture.goals.away || 0,
          athlete_stats: athleteStats,
          last_event: lastEvent,
          updated_at: new Date().toISOString(),
        };

        // Upsert into athlete_live_matches
        const { error: upsertError } = await supabase
          .from('athlete_live_matches')
          .upsert(matchData, {
            onConflict: 'athlete_id',
          });

        if (upsertError) {
          console.error(`Error upserting live match for ${athlete.name}:`, upsertError);
        } else {
          console.log(`Updated live match for ${athlete.name}: ${ourTeamName} vs ${opponentName} (${ourStatus}, ${currentMinute}')`);
          processedMatches.push({
            athlete: athlete.name,
            opponent: opponentName,
            status: ourStatus,
            minute: currentMinute,
            score: `${fixture.goals.home}-${fixture.goals.away}`,
          });
        }
      }
    }

    // Clean up finished matches (mark as finished, will be removed by daily cleanup)
    if (relevantFixtures.length === 0) {
      // No live matches - check if any existing live matches should be marked finished
      const { data: existingLive } = await supabase
        .from('athlete_live_matches')
        .select('id, athlete_id, match_status')
        .in('match_status', ['live', 'halftime']);

      if (existingLive?.length) {
        console.log(`Found ${existingLive.length} stale live matches to mark as finished`);
        
        for (const match of existingLive) {
          await supabase
            .from('athlete_live_matches')
            .update({ match_status: 'finished' })
            .eq('id', match.id);
        }
      }
    }

    return new Response(JSON.stringify({
      success: true,
      message: `Processed ${processedMatches.length} live matches`,
      liveMatches: processedMatches,
      totalLiveFixtures: liveData.response.length,
      relevantFixtures: relevantFixtures.length,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in sync-live-matches:', error);
    return new Response(JSON.stringify({ 
      error: errorMessage,
      success: false 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

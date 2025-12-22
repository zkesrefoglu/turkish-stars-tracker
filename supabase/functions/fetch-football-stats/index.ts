import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-webhook-secret',
};

const API_FOOTBALL_BASE = 'https://v3.football.api-sports.io';
const CURRENT_SEASON = 2024;

// Team IDs
const TEAM_IDS: Record<string, number> = {
  'Real Madrid': 541,
  'Juventus': 496,
  'Brighton': 51,
  'Brighton & Hove Albion': 51,
  'Eintracht Frankfurt': 169,
  'Lille': 79,
  'Udinese': 494,
  'Inter Milan': 505,
  'Inter': 505,
  'Cagliari': 490,
  'Bournemouth': 35,
  'AS Roma': 497,
  'Al-Ahli': 2932,
  'Al Ahli': 2932,
  'Al-Ahli Saudi': 2932,
  'Al-Hilal': 2939,
  'Al Hilal': 2939,
  'Al-Hilal Saudi': 2939,
};

// Player name mappings for Turkish characters
const PLAYER_NAME_VARIANTS: Record<string, string[]> = {
  'Arda Guler': ['Arda Güler', 'Güler', 'Guler', 'A. Güler'],
  'Kenan Yildiz': ['Kenan Yıldız', 'Yıldız', 'Yildiz', 'K. Yıldız'],
  'Ferdi Kadioglu': ['Ferdi Kadıoğlu', 'Kadıoğlu', 'Kadioglu', 'F. Kadıoğlu'],
  'Can Uzun': ['Can Uzun', 'Uzun', 'C. Uzun'],
  'Berke Ozer': ['Berke Özer', 'Özer', 'Ozer', 'B. Özer'],
  'Hakan Calhanoglu': ['Hakan Çalhanoğlu', 'Çalhanoğlu', 'Calhanoglu', 'H. Çalhanoğlu'],
  'Semih Kılıçsoy': ['Semih Kilicsoy', 'Kılıçsoy', 'Kilicsoy', 'S. Kılıçsoy'],
  'Enes Ünal': ['Enes Unal', 'Ünal', 'Unal', 'E. Ünal'],
  'Zeki Çelik': ['Zeki Celik', 'Çelik', 'Celik', 'Z. Çelik'],
  'Merih Demiral': ['Merih Demiral', 'Demiral', 'M. Demiral'],
  'Yusuf Akçiçek': ['Yusuf Akcicek', 'Akçiçek', 'Akcicek', 'Y. Akçiçek'],
};

interface ApiFootballResponse {
  response: any[];
  errors: any;
  results: number;
}

async function fetchApiFootball(endpoint: string, apiKey: string): Promise<ApiFootballResponse | null> {
  const url = `${API_FOOTBALL_BASE}${endpoint}`;
  console.log(`Fetching: ${endpoint}`);
  
  try {
    const response = await fetch(url, {
      headers: {
        'x-rapidapi-key': apiKey,
        'x-rapidapi-host': 'v3.football.api-sports.io',
      },
    });

    if (!response.ok) {
      console.error(`API error: ${response.status}`);
      return null;
    }

    const data = await response.json();
    
    if (data.errors && Object.keys(data.errors).length > 0) {
      console.error('API errors:', data.errors);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Fetch error:', error);
    return null;
  }
}

function matchPlayerName(apiName: string, athleteName: string): boolean {
  const apiNameLower = apiName.toLowerCase();
  const variants = PLAYER_NAME_VARIANTS[athleteName] || [athleteName];
  
  for (const variant of variants) {
    if (apiNameLower.includes(variant.toLowerCase()) || variant.toLowerCase().includes(apiNameLower)) {
      return true;
    }
  }
  
  // Check last name match
  const lastName = athleteName.split(' ').pop()?.toLowerCase();
  if (lastName && apiNameLower.includes(lastName)) {
    return true;
  }
  
  return false;
}

async function findPlayerInTeam(teamId: number, playerName: string, apiKey: string): Promise<number | null> {
  console.log(`Searching for ${playerName} in team ${teamId}...`);
  
  const squadData = await fetchApiFootball(`/players/squads?team=${teamId}`, apiKey);
  
  if (!squadData?.response?.[0]?.players) {
    return null;
  }

  const squad = squadData.response[0].players;
  
  for (const player of squad) {
    if (matchPlayerName(player.name || '', playerName)) {
      console.log(`Found: ${player.name} (ID: ${player.id})`);
      return player.id;
    }
  }
  
  return null;
}

// Get player stats from a specific fixture
async function getPlayerStatsFromFixture(
  fixtureId: number, 
  playerId: number,
  playerName: string,
  apiKey: string
): Promise<any | null> {
  const data = await fetchApiFootball(`/fixtures/players?fixture=${fixtureId}`, apiKey);
  
  if (!data?.response) {
    return null;
  }

  // Search through both teams' players
  for (const teamData of data.response) {
    const players = teamData.players || [];
    
    for (const playerEntry of players) {
      const player = playerEntry.player;
      const stats = playerEntry.statistics?.[0];
      
      // Match by ID or name
      if (player?.id === playerId || matchPlayerName(player?.name || '', playerName)) {
        console.log(`Found player stats for ${player?.name} in fixture ${fixtureId}`);
        
        return {
          minutes_played: stats?.games?.minutes || 0,
          rating: stats?.games?.rating ? parseFloat(stats.games.rating) : null,
          played: (stats?.games?.minutes || 0) > 0,
          stats: {
            goals: stats?.goals?.total || 0,
            assists: stats?.goals?.assists || 0,
            shots_total: stats?.shots?.total || 0,
            shots_on_target: stats?.shots?.on || 0,
            passes_total: stats?.passes?.total || 0,
            passes_accuracy: stats?.passes?.accuracy || 0,
            key_passes: stats?.passes?.key || 0,
            tackles: stats?.tackles?.total || 0,
            interceptions: stats?.tackles?.interceptions || 0,
            dribbles_success: stats?.dribbles?.success || 0,
            dribbles_attempts: stats?.dribbles?.attempts || 0,
            duels_won: stats?.duels?.won || 0,
            fouls_committed: stats?.fouls?.committed || 0,
            fouls_drawn: stats?.fouls?.drawn || 0,
            yellow_cards: stats?.cards?.yellow || 0,
            red_cards: stats?.cards?.red || 0,
            // Goalkeeper stats
            saves: stats?.goals?.saves || 0,
            goals_conceded: stats?.goals?.conceded || 0,
            penalties_saved: stats?.penalty?.saved || 0,
            penalties_missed: stats?.penalty?.missed || 0,
          }
        };
      }
    }
  }
  
  return null;
}

async function fetchTeamFixturesWithStats(
  apiKey: string, 
  teamName: string,
  playerId: number,
  playerName: string,
  type: 'next' | 'last'
): Promise<any[]> {
  const fixtures: any[] = [];
  
  let teamId = TEAM_IDS[teamName];
  if (!teamId) {
    const teamSearch = await fetchApiFootball(`/teams?search=${encodeURIComponent(teamName)}`, apiKey);
    teamId = teamSearch?.response?.[0]?.team?.id;
  }
  
  if (!teamId) {
    console.log(`Could not find team: ${teamName}`);
    return fixtures;
  }

  const fixturesData = await fetchApiFootball(`/fixtures?team=${teamId}&${type}=10`, apiKey);
  
  if (!fixturesData?.response) {
    return fixtures;
  }

  for (const fixture of fixturesData.response) {
    const fixtureId = fixture.fixture?.id;
    const isHome = fixture.teams?.home?.id === teamId;
    const opponent = isHome ? fixture.teams?.away?.name : fixture.teams?.home?.name;
    const homeScore = fixture.goals?.home;
    const awayScore = fixture.goals?.away;
    const matchDate = fixture.fixture?.date;
    const status = fixture.fixture?.status?.short;
    
    const fixtureData: any = {
      fixture_id: fixtureId,
      date: matchDate ? new Date(matchDate).toISOString().split('T')[0] : null,
      match_date: matchDate,
      opponent: opponent || 'Unknown',
      competition: fixture.league?.name || 'Unknown',
      home_away: isHome ? 'home' : 'away',
      match_result: homeScore !== null && awayScore !== null ? `${homeScore}-${awayScore}` : null,
      status: status,
    };
    
    // For completed matches, get player-specific stats
    if (type === 'last' && status === 'FT' && fixtureId) {
      console.log(`Fetching player stats for fixture ${fixtureId}...`);
      const playerStats = await getPlayerStatsFromFixture(fixtureId, playerId, playerName, apiKey);
      
      if (playerStats) {
        fixtureData.minutes_played = playerStats.minutes_played;
        fixtureData.rating = playerStats.rating;
        fixtureData.played = playerStats.played;
        fixtureData.stats = playerStats.stats;
      } else {
        // Player didn't play or stats not found
        fixtureData.minutes_played = 0;
        fixtureData.rating = null;
        fixtureData.played = false;
        fixtureData.stats = {};
      }
      
      // Small delay to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    fixtures.push(fixtureData);
  }
  
  return fixtures;
}

function parseSeasonStats(data: ApiFootballResponse): any[] {
  const seasonStats: any[] = [];
  
  const playerResponse = data.response?.[0];
  if (!playerResponse) return seasonStats;

  const statistics = playerResponse.statistics || [];
  
  for (const stat of statistics) {
    const league = stat.league;
    const games = stat.games;
    const goals = stat.goals;
    const passes = stat.passes;
    const tackles = stat.tackles;
    const cards = stat.cards;
    const penalty = stat.penalty;

    seasonStats.push({
      season: `${league?.season || CURRENT_SEASON}/${(league?.season || CURRENT_SEASON) + 1}`.slice(-7),
      competition: league?.name || 'Unknown',
      games_played: games?.appearences || 0,
      games_started: games?.lineups || 0,
      stats: {
        goals: goals?.total || 0,
        assists: goals?.assists || 0,
        minutes: games?.minutes || 0,
        yellow_cards: cards?.yellow || 0,
        red_cards: cards?.red || 0,
        rating: games?.rating ? parseFloat(games.rating) : null,
        shots_total: stat.shots?.total || 0,
        shots_on_target: stat.shots?.on || 0,
        passes_total: passes?.total || 0,
        passes_accuracy: passes?.accuracy || 0,
        key_passes: passes?.key || 0,
        tackles: tackles?.total || 0,
        interceptions: tackles?.interceptions || 0,
        // Goalkeeper stats
        saves: goals?.saves || 0,
        goals_conceded: goals?.conceded || 0,
        clean_sheets: games?.lineups ? (games.lineups - (goals?.conceded > 0 ? Math.min(goals.conceded, games.lineups) : 0)) : 0,
        penalties_saved: penalty?.saved || 0,
        penalties_missed: penalty?.missed || 0,
      },
    });
  }
  
  return seasonStats;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Validate authorization - allow either webhook secret OR valid auth header
  const webhookSecret = Deno.env.get("STATS_WEBHOOK_SECRET");
  const providedSecret = req.headers.get("x-webhook-secret");
  const authHeader = req.headers.get("authorization");
  
  // Check if webhook secret matches OR if there's a valid auth header (from supabase.functions.invoke)
  // SECURITY: Reject if webhook secret is not configured AND no auth header provided
  const hasValidWebhookSecret = webhookSecret && providedSecret === webhookSecret;
  const hasAuthHeader = authHeader && authHeader.startsWith("Bearer ");
  
  if (!hasValidWebhookSecret && !hasAuthHeader) {
    // If webhook secret is provided but doesn't match, or if no auth at all
    const reason = providedSecret && !webhookSecret 
      ? "STATS_WEBHOOK_SECRET not configured"
      : providedSecret && providedSecret !== webhookSecret
        ? "Invalid webhook secret"
        : "Missing authentication";
    console.error(`Unauthorized: ${reason}`);
    return new Response(
      JSON.stringify({ error: "Unauthorized" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const apiFootballKey = Deno.env.get('API_FOOTBALL_KEY');
    
    if (!apiFootballKey) {
      throw new Error('API_FOOTBALL_KEY not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Starting football stats fetch...');

    const { data: athletes, error: athletesError } = await supabase
      .from('athlete_profiles')
      .select('id, slug, api_football_id, name, team')
      .eq('sport', 'football');

    if (athletesError) {
      throw new Error(`Error fetching athletes: ${athletesError.message}`);
    }

    console.log(`Found ${athletes?.length || 0} football athletes`);

    const results: any[] = [];

    for (const athlete of athletes || []) {
      try {
        let playerId = athlete.api_football_id;
        
        // Find player ID if not set
        if (!playerId) {
          const teamId = TEAM_IDS[athlete.team];
          if (teamId) {
            playerId = await findPlayerInTeam(teamId, athlete.name, apiFootballKey);
            
            if (playerId) {
              await supabase
                .from('athlete_profiles')
                .update({ api_football_id: playerId })
                .eq('id', athlete.id);
              console.log(`Saved API ID ${playerId} for ${athlete.name}`);
            }
          }
          
          if (!playerId) {
            results.push({ athlete: athlete.name, status: 'not_found' });
            continue;
          }
        }

        console.log(`Processing ${athlete.name} (ID: ${playerId})...`);
        
        // Get season stats
        const playerData = await fetchApiFootball(
          `/players?id=${playerId}&season=${CURRENT_SEASON}`,
          apiFootballKey
        );
        
        const seasonStats = playerData ? parseSeasonStats(playerData) : [];
        
        // Get recent matches WITH player-specific stats
        const recentMatches = await fetchTeamFixturesWithStats(
          apiFootballKey, 
          athlete.team, 
          playerId,
          athlete.name,
          'last'
        );

        // Upsert match stats
        let matchesWithStats = 0;
        for (const match of recentMatches) {
          if (match.date && match.status === 'FT') {
            const { error: updateError } = await supabase
              .from('athlete_daily_updates')
              .upsert({
                athlete_id: athlete.id,
                date: match.date,
                opponent: match.opponent,
                competition: match.competition,
                home_away: match.home_away,
                match_result: match.match_result,
                played: match.played ?? false,
                minutes_played: match.minutes_played ?? 0,
                rating: match.rating,
                stats: match.stats || {},
              }, {
                onConflict: 'athlete_id,date',
                ignoreDuplicates: false,
              });

            if (!updateError && match.played) {
              matchesWithStats++;
            }
          }
        }

        // Upsert season stats
        for (const stats of seasonStats) {
          await supabase
            .from('athlete_season_stats')
            .upsert({
              athlete_id: athlete.id,
              season: stats.season,
              competition: stats.competition,
              games_played: stats.games_played,
              games_started: stats.games_started,
              stats: stats.stats,
            }, {
              onConflict: 'athlete_id,season,competition',
              ignoreDuplicates: false,
            });
        }

        // Get upcoming fixtures
        const upcomingMatches = await fetchTeamFixturesWithStats(
          apiFootballKey, 
          athlete.team,
          playerId,
          athlete.name,
          'next'
        );
        
        // Clear and insert upcoming matches
        await supabase
          .from('athlete_upcoming_matches')
          .delete()
          .eq('athlete_id', athlete.id);

        for (const match of upcomingMatches.slice(0, 5)) {
          if (match.match_date) {
            await supabase
              .from('athlete_upcoming_matches')
              .insert({
                athlete_id: athlete.id,
                match_date: match.match_date,
                opponent: match.opponent,
                competition: match.competition,
                home_away: match.home_away,
              });
          }
        }

        results.push({
          athlete: athlete.name,
          api_football_id: playerId,
          status: 'success',
          matches_with_stats: matchesWithStats,
          total_matches: recentMatches.filter(m => m.status === 'FT').length,
          upcoming_matches: upcomingMatches.length,
          season_stats: seasonStats.length,
        });

        // Delay between players
        await new Promise(resolve => setTimeout(resolve, 500));

      } catch (playerError: any) {
        console.error(`Error processing ${athlete.name}:`, playerError);
        results.push({ athlete: athlete.name, status: 'error', error: playerError?.message });
      }
    }

    console.log('Football stats fetch completed');

    return new Response(JSON.stringify({
      success: true,
      timestamp: new Date().toISOString(),
      api: 'API-Football',
      results,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error?.message,
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

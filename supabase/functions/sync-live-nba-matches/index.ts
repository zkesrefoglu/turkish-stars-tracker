import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-webhook-secret',
};

const BALLDONTLIE_BASE_URL = 'https://api.balldontlie.io/v1';
const ROCKETS_TEAM_ID = 11;

async function fetchWithAuth(url: string, apiKey: string): Promise<any> {
  console.log(`Fetching: ${url}`);
  
  const response = await fetch(url, {
    headers: { 'Authorization': apiKey },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`Balldontlie API error: ${response.status}`, errorText);
    throw new Error(`Balldontlie API error: ${response.status} - ${errorText}`);
  }

  return response.json();
}

// Convert BallDontLie status to our match_status
function mapGameStatus(status: string): 'scheduled' | 'live' | 'halftime' | 'finished' {
  if (!status) return 'scheduled';
  
  const s = status.toLowerCase();
  
  if (s === 'final') return 'finished';
  if (s === 'halftime' || s === 'half') return 'halftime';
  if (s.includes('qtr') || s.includes('quarter') || s.includes('ot') || s === 'in progress') {
    return 'live';
  }
  
  // If status is a time like "7:00 pm ET", it's scheduled
  return 'scheduled';
}

// Parse the current quarter/time info for display
function formatGameClock(status: string, time?: string): string {
  if (!status) return '';
  
  const s = status.toLowerCase();
  
  if (s === 'halftime' || s === 'half') return 'Halftime';
  if (s === 'final') return 'Final';
  
  // Parse quarter info like "1st Qtr", "2nd Qtr", etc.
  const qtrMatch = status.match(/(\d)(st|nd|rd|th)\s*(qtr|quarter)/i);
  if (qtrMatch) {
    const qtr = qtrMatch[1];
    const timeStr = time ? ` · ${time}` : '';
    return `Q${qtr}${timeStr}`;
  }
  
  // Overtime
  if (s.includes('ot')) {
    const otMatch = status.match(/(\d)?.*ot/i);
    const otNum = otMatch?.[1] || '1';
    const timeStr = time ? ` · ${time}` : '';
    return `OT${otNum !== '1' ? otNum : ''}${timeStr}`;
  }
  
  return status;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get('BALLDONTLIE_API_KEY');
    if (!apiKey) {
      throw new Error('BALLDONTLIE_API_KEY not configured');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Starting NBA live match sync...');

    // Get Alperen Sengun from database
    const { data: athlete, error: athleteError } = await supabase
      .from('athlete_profiles')
      .select('id, slug, balldontlie_id, name, team')
      .eq('slug', 'alperen-sengun')
      .single();

    if (athleteError || !athlete) {
      throw new Error(`Athlete not found: ${athleteError?.message || 'No data'}`);
    }

    // Fetch today's Rockets games (and yesterday/tomorrow to catch timezone edge cases)
    const today = new Date();
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
    const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
    
    const startDate = yesterday.toISOString().split('T')[0];
    const endDate = tomorrow.toISOString().split('T')[0];

    console.log(`Fetching Rockets games from ${startDate} to ${endDate}`);

    const gamesData = await fetchWithAuth(
      `${BALLDONTLIE_BASE_URL}/games?team_ids[]=${ROCKETS_TEAM_ID}&start_date=${startDate}&end_date=${endDate}&per_page=10`,
      apiKey
    );

    const games = gamesData.data || [];
    console.log(`Found ${games.length} games in date range`);

    let liveMatchUpdated = false;
    let matchDetails: any = null;

    for (const game of games) {
      const status = mapGameStatus(game.status);
      console.log(`Game ${game.id}: status="${game.status}" -> mapped="${status}", time="${game.time || 'N/A'}"`);

      // Only process live or halftime games
      if (status !== 'live' && status !== 'halftime') {
        // If game just finished, mark it as finished in our DB
        if (status === 'finished') {
          await supabase
            .from('athlete_live_matches')
            .update({ match_status: 'finished' })
            .eq('athlete_id', athlete.id);
        }
        continue;
      }

      // Determine home/away
      const isHome = game.home_team?.id === ROCKETS_TEAM_ID;
      const opponent = isHome ? game.visitor_team?.full_name : game.home_team?.full_name;
      const homeScore = game.home_team_score ?? 0;
      const awayScore = game.visitor_team_score ?? 0;

      // Build game clock display
      const gameClock = formatGameClock(game.status, game.time);

      // Try to fetch Alperen's live stats for this game
      let athleteStats: any = {};
      if (athlete.balldontlie_id) {
        try {
          const statsData = await fetchWithAuth(
            `${BALLDONTLIE_BASE_URL}/stats?player_ids[]=${athlete.balldontlie_id}&game_ids[]=${game.id}`,
            apiKey
          );
          
          if (statsData.data && statsData.data.length > 0) {
            const stat = statsData.data[0];
            athleteStats = {
              points: stat.pts || 0,
              rebounds: stat.reb || 0,
              assists: stat.ast || 0,
              steals: stat.stl || 0,
              blocks: stat.blk || 0,
              minutes: stat.min || '0',
              fg: `${stat.fgm || 0}/${stat.fga || 0}`,
              fg3: `${stat.fg3m || 0}/${stat.fg3a || 0}`,
              ft: `${stat.ftm || 0}/${stat.fta || 0}`,
            };
            console.log(`Got live stats for Alperen: ${athleteStats.points} PTS, ${athleteStats.rebounds} REB, ${athleteStats.assists} AST`);
          }
        } catch (statsError) {
          console.error('Could not fetch live player stats:', statsError);
        }
      }

      // Build last_event string with game clock
      const lastEvent = gameClock || null;

      // Calculate approximate current minute (for consistency with football)
      // Q1 = 0-12, Q2 = 12-24, HT = 24, Q3 = 24-36, Q4 = 36-48, OT = 48+
      let currentMinute = 0;
      const qtrMatch = game.status?.match(/(\d)(st|nd|rd|th)\s*(qtr|quarter)/i);
      if (qtrMatch) {
        const qtr = parseInt(qtrMatch[1]);
        currentMinute = (qtr - 1) * 12;
        // Add remaining time if available
        if (game.time) {
          const timeMatch = game.time.match(/(\d+):(\d+)/);
          if (timeMatch) {
            const mins = parseInt(timeMatch[1]);
            currentMinute += (12 - mins);
          }
        }
      } else if (game.status?.toLowerCase().includes('halftime')) {
        currentMinute = 24;
      }

      // Upsert the live match
      const { error: upsertError } = await supabase
        .from('athlete_live_matches')
        .upsert({
          athlete_id: athlete.id,
          opponent: opponent || 'Unknown',
          competition: 'NBA',
          home_away: isHome ? 'home' : 'away',
          match_status: status,
          kickoff_time: new Date(game.date).toISOString(),
          current_minute: currentMinute,
          home_score: homeScore,
          away_score: awayScore,
          athlete_stats: athleteStats,
          last_event: lastEvent,
        }, {
          onConflict: 'athlete_id',
        });

      if (upsertError) {
        console.error('Error upserting live match:', upsertError);
      } else {
        liveMatchUpdated = true;
        matchDetails = {
          opponent,
          score: `${homeScore}-${awayScore}`,
          status: status,
          gameClock,
          athleteStats,
        };
        console.log(`Updated live match: ${athlete.team} vs ${opponent} - ${homeScore}-${awayScore}`);
      }
    }

    // If no live games found, clean up any stale entries
    if (!liveMatchUpdated) {
      const { error: deleteError } = await supabase
        .from('athlete_live_matches')
        .delete()
        .eq('athlete_id', athlete.id)
        .in('match_status', ['live', 'halftime']);
      
      if (deleteError) {
        console.log('No stale entries to clean up or error:', deleteError);
      }
    }

    console.log('NBA live match sync completed');

    return new Response(JSON.stringify({
      success: true,
      timestamp: new Date().toISOString(),
      athlete: athlete.name,
      liveMatchFound: liveMatchUpdated,
      matchDetails,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Error in sync-live-nba-matches:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error?.message || 'Unknown error',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

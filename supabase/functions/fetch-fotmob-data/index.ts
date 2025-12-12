import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const FOTMOB_BASE = 'https://www.fotmob.com/api';

interface AthleteProfile {
  id: string;
  name: string;
  fotmob_id: number | null;
  sport: string;
}

interface FotMobPlayerData {
  id: number;
  name: string;
  birthDate?: { utcTime: string };
  height?: number;
  preferredFoot?: string;
  primaryTeam?: {
    teamId: number;
    teamName: string;
  };
  positionDescription?: { primaryPosition: { label: string } };
  mainLeague?: { leagueName: string };
  careerHistory?: {
    careerItems?: {
      entries?: Array<{
        teamId: number;
        teamName: string;
        teamLogo: string;
        matches: number;
        goals: number;
        assists: number;
        season: string;
        tournamentName: string;
      }>;
    };
  };
  recentMatches?: Array<{
    matchId: number;
    opponentTeamName: string;
    opponentTeamId: number;
    homeScore: number;
    awayScore: number;
    isHome: boolean;
    playerRating?: number;
    matchDate: { utcTime: string };
    leagueName: string;
    goals?: number;
    assists?: number;
    minutesPlayed?: number;
  }>;
  injuryHistory?: Array<{
    injuryType: string;
    startDate: string;
    endDate?: string;
    gamesMissed?: number;
  }>;
  meta?: {
    seopath?: string;
  };
}

async function fetchFotMobPlayer(fotmobId: number): Promise<FotMobPlayerData | null> {
  try {
    console.log(`Fetching FotMob data for player ID: ${fotmobId}`);
    
    // FotMob requires specific headers to not block the request
    const response = await fetch(`${FOTMOB_BASE}/playerData?id=${fotmobId}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Origin': 'https://www.fotmob.com',
        'Referer': 'https://www.fotmob.com/',
        'Sec-Ch-Ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
        'Sec-Ch-Ua-Mobile': '?0',
        'Sec-Ch-Ua-Platform': '"macOS"',
        'Sec-Fetch-Dest': 'empty',
        'Sec-Fetch-Mode': 'cors',
        'Sec-Fetch-Site': 'same-origin',
      },
    });
    
    if (!response.ok) {
      console.error(`FotMob API error: ${response.status} ${response.statusText}`);
      return null;
    }
    
    const data = await response.json();
    
    // Check if we got valid data
    if (!data || !data.name) {
      console.error(`FotMob returned empty/invalid data for player ${fotmobId}`);
      console.log('Response data:', JSON.stringify(data).substring(0, 500));
      return null;
    }
    
    console.log(`Successfully fetched FotMob data for ${data.name}`);
    return data;
  } catch (error) {
    console.error(`Error fetching FotMob player ${fotmobId}:`, error);
    return null;
  }
}

async function processSeasonStats(
  supabase: any,
  athleteId: string,
  playerData: FotMobPlayerData
): Promise<number> {
  let count = 0;
  
  const careerEntries = playerData.careerHistory?.careerItems?.entries || [];
  
  for (const entry of careerEntries) {
    if (!entry.season || !entry.tournamentName) continue;
    
    const seasonStats = {
      athlete_id: athleteId,
      season: entry.season,
      competition: entry.tournamentName,
      games_played: entry.matches || 0,
      games_started: null,
      stats: {
        goals: entry.goals || 0,
        assists: entry.assists || 0,
        team: entry.teamName,
        team_id: entry.teamId,
        source: 'fotmob',
      },
    };
    
    const { error } = await supabase
      .from('athlete_season_stats')
      .upsert(seasonStats, {
        onConflict: 'athlete_id,season,competition',
        ignoreDuplicates: false,
      });
    
    if (!error) count++;
  }
  
  return count;
}

async function processRecentMatches(
  supabase: any,
  athleteId: string,
  playerData: FotMobPlayerData
): Promise<number> {
  let count = 0;
  
  const recentMatches = playerData.recentMatches || [];
  
  for (const match of recentMatches) {
    const matchDate = new Date(match.matchDate?.utcTime);
    if (isNaN(matchDate.getTime())) continue;
    
    const dateStr = matchDate.toISOString().split('T')[0];
    const homeAway = match.isHome ? 'home' : 'away';
    const homeScore = match.homeScore ?? 0;
    const awayScore = match.awayScore ?? 0;
    const result = match.isHome 
      ? `${homeScore}-${awayScore}`
      : `${awayScore}-${homeScore}`;
    
    const dailyUpdate = {
      athlete_id: athleteId,
      date: dateStr,
      opponent: match.opponentTeamName,
      competition: match.leagueName || 'Unknown',
      home_away: homeAway,
      match_result: result,
      played: true,
      minutes_played: match.minutesPlayed || null,
      rating: match.playerRating || null,
      stats: {
        goals: match.goals || 0,
        assists: match.assists || 0,
        fotmob_match_id: match.matchId,
        source: 'fotmob',
      },
      injury_status: 'healthy',
    };
    
    // Check if update already exists for this date and athlete
    const { data: existing } = await supabase
      .from('athlete_daily_updates')
      .select('id, stats')
      .eq('athlete_id', athleteId)
      .eq('date', dateStr)
      .single();
    
    if (existing) {
      // Merge FotMob data with existing data
      const mergedStats = {
        ...existing.stats,
        fotmob_rating: match.playerRating,
        fotmob_match_id: match.matchId,
      };
      
      const { error } = await supabase
        .from('athlete_daily_updates')
        .update({ 
          stats: mergedStats,
          rating: match.playerRating || existing.rating,
        })
        .eq('id', existing.id);
      
      if (!error) count++;
    } else {
      const { error } = await supabase
        .from('athlete_daily_updates')
        .insert(dailyUpdate);
      
      if (!error) count++;
    }
  }
  
  return count;
}

async function processInjuryHistory(
  supabase: any,
  athleteId: string,
  playerData: FotMobPlayerData
): Promise<number> {
  let count = 0;
  
  const injuries = playerData.injuryHistory || [];
  
  for (const injury of injuries) {
    if (!injury.startDate) continue;
    
    const injuryRecord = {
      athlete_id: athleteId,
      injury_type: injury.injuryType || 'Unknown Injury',
      start_date: injury.startDate,
      end_date: injury.endDate || null,
      games_missed: injury.gamesMissed || null,
      is_current: !injury.endDate,
      source_url: `https://www.fotmob.com/players/${playerData.id}`,
    };
    
    // Check for existing injury with same start date
    const { data: existing } = await supabase
      .from('athlete_injury_history')
      .select('id')
      .eq('athlete_id', athleteId)
      .eq('start_date', injury.startDate)
      .single();
    
    if (!existing) {
      const { error } = await supabase
        .from('athlete_injury_history')
        .insert(injuryRecord);
      
      if (!error) count++;
    }
  }
  
  return count;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Check authorization
    const webhookSecret = Deno.env.get('STATS_WEBHOOK_SECRET');
    const requestSecret = req.headers.get('x-webhook-secret');
    const authHeader = req.headers.get('authorization');
    
    if (requestSecret !== webhookSecret && !authHeader) {
      console.error('Unauthorized: Invalid or missing webhook secret and no auth header');
      return new Response('Unauthorized', { status: 401, headers: corsHeaders });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Starting FotMob data sync...');

    // Get all football athletes with FotMob IDs
    const { data: athletes, error: athletesError } = await supabase
      .from('athlete_profiles')
      .select('id, name, fotmob_id, sport')
      .eq('sport', 'football')
      .not('fotmob_id', 'is', null);

    if (athletesError) {
      throw new Error(`Failed to fetch athletes: ${athletesError.message}`);
    }

    console.log(`Found ${athletes?.length || 0} football athletes with FotMob IDs`);

    const results: Array<{
      athlete: string;
      fotmobId: number;
      seasonStats: number;
      matchUpdates: number;
      injuries: number;
      error?: string;
    }> = [];

    for (const athlete of (athletes || []) as AthleteProfile[]) {
      if (!athlete.fotmob_id) continue;

      console.log(`Processing ${athlete.name} (FotMob ID: ${athlete.fotmob_id})`);
      
      const playerData = await fetchFotMobPlayer(athlete.fotmob_id);
      
      if (!playerData) {
        results.push({
          athlete: athlete.name,
          fotmobId: athlete.fotmob_id,
          seasonStats: 0,
          matchUpdates: 0,
          injuries: 0,
          error: 'Failed to fetch FotMob data',
        });
        continue;
      }

      try {
        const seasonStatsCount = await processSeasonStats(supabase, athlete.id, playerData);
        const matchUpdatesCount = await processRecentMatches(supabase, athlete.id, playerData);
        const injuriesCount = await processInjuryHistory(supabase, athlete.id, playerData);

        results.push({
          athlete: athlete.name,
          fotmobId: athlete.fotmob_id,
          seasonStats: seasonStatsCount,
          matchUpdates: matchUpdatesCount,
          injuries: injuriesCount,
        });

        console.log(`Completed ${athlete.name}: ${seasonStatsCount} season stats, ${matchUpdatesCount} match updates, ${injuriesCount} injuries`);
      } catch (error: any) {
        console.error(`Error processing ${athlete.name}:`, error);
        results.push({
          athlete: athlete.name,
          fotmobId: athlete.fotmob_id,
          seasonStats: 0,
          matchUpdates: 0,
          injuries: 0,
          error: error.message,
        });
      }

      // Rate limiting: wait 1 second between players to avoid being blocked
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    const summary = {
      athletesProcessed: results.length,
      totalSeasonStats: results.reduce((sum, r) => sum + r.seasonStats, 0),
      totalMatchUpdates: results.reduce((sum, r) => sum + r.matchUpdates, 0),
      totalInjuries: results.reduce((sum, r) => sum + r.injuries, 0),
      errors: results.filter(r => r.error).length,
    };

    console.log('FotMob sync complete:', summary);

    return new Response(
      JSON.stringify({
        success: true,
        summary,
        details: results,
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error('FotMob sync error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});

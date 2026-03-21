// DEPRECATED: This Supabase edge function is no longer used.
// Hollinger stats are now fetched via Vercel serverless function at /api/fetch-hollinger-stats.js
// NBA.com blocks/throttles requests from Supabase edge function IPs, so we moved to Vercel.
// Cron job #3 now calls https://tst.zke-solutions.com/api/fetch-hollinger-stats
//
// Keeping this file for reference only.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-webhook-secret',
};

// ---- Inlined auth ----
async function validateAuth(req: Request): Promise<{ authorized: boolean; reason: string; userId?: string }> {
  const webhookSecret = Deno.env.get('STATS_WEBHOOK_SECRET');
  const providedSecret = req.headers.get('x-webhook-secret');
  if (providedSecret) {
    if (!webhookSecret) return { authorized: false, reason: 'STATS_WEBHOOK_SECRET not configured' };
    if (providedSecret === webhookSecret) return { authorized: true, reason: 'webhook_secret' };
    return { authorized: false, reason: 'Invalid webhook secret' };
  }
  return { authorized: false, reason: 'Missing authentication' };
}

async function checkCooldown(syncType: string, cooldownSeconds: number): Promise<{ canRun: boolean; waitSeconds?: number }> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, serviceRoleKey);
  const { data } = await supabase.from('sync_logs').select('synced_at').eq('sync_type', syncType).eq('status', 'success').order('synced_at', { ascending: false }).limit(1).maybeSingle();
  if (!data) return { canRun: true };
  const elapsed = (Date.now() - new Date(data.synced_at).getTime()) / 1000;
  if (elapsed < cooldownSeconds) return { canRun: false, waitSeconds: Math.ceil(cooldownSeconds - elapsed) };
  return { canRun: true };
}
// ---- End inlined auth ----

interface PlayerData {
  rank: number;
  player_name: string;
  team: string;
  per: number | null;
  ts_pct: number | null;
  ws: number | null;
  efficiency_index: number | null;
  is_featured_athlete: boolean;
}

// NBA.com stats API for advanced player stats
// Returns PER, TS%, WS, and other advanced metrics in JSON format
function getNbaStatsUrl(): string {
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();
  // NBA season: if Oct+ use current year, otherwise previous year
  const seasonStart = month >= 10 ? year : year - 1;
  const seasonEnd = (seasonStart + 1).toString().slice(-2);
  const season = `${seasonStart}-${seasonEnd}`;

  return `https://stats.nba.com/stats/leaguedashplayerstats?` +
    `Conference=&DateFrom=&DateTo=&Division=&GameScope=&GameSegment=&` +
    `Height=&LastNGames=0&LeagueID=00&Location=&MeasureType=Advanced&` +
    `Month=0&OpponentTeamID=0&Outcome=&PORound=0&PaceAdjust=N&` +
    `PerMode=PerGame&Period=0&PlayerExperience=&PlayerPosition=&` +
    `PlusMinus=N&Rank=N&Season=${season}&SeasonSegment=&` +
    `SeasonType=Regular+Season&ShotClockRange=&StarterBench=&` +
    `TeamID=0&VsConference=&VsDivision=&Weight=`;
}

async function fetchNbaAdvancedStats(): Promise<PlayerData[]> {
  const url = getNbaStatsUrl();
  console.log(`Fetching NBA advanced stats from stats.nba.com...`);

  const response = await fetch(url, {
    headers: {
      'Accept': 'application/json, text/plain, */*',
      'Accept-Language': 'en-US,en;q=0.9',
      'Origin': 'https://www.nba.com',
      'Referer': 'https://www.nba.com/',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'x-nba-stats-origin': 'stats',
      'x-nba-stats-token': 'true',
    },
  });

  if (!response.ok) {
    console.error(`NBA stats API error: ${response.status}`);
    throw new Error(`NBA stats API error: ${response.status}`);
  }

  const data = await response.json();
  const headers: string[] = data.resultSets?.[0]?.headers || [];
  const rows: any[][] = data.resultSets?.[0]?.rowSet || [];

  if (headers.length === 0 || rows.length === 0) {
    throw new Error('No data returned from NBA stats API');
  }

  // Find column indices
  const playerNameIdx = headers.indexOf('PLAYER_NAME');
  const teamIdx = headers.indexOf('TEAM_ABBREVIATION');
  const perIdx = headers.indexOf('PIE') !== -1 ? headers.indexOf('PIE') : -1; // PIE is available in advanced
  const tsIdx = headers.indexOf('TS_PCT');
  const wsIdx = headers.indexOf('W_PCT'); // Closest to win shares available in this endpoint

  // For PER specifically, we need the player efficiency endpoint
  // The advanced stats endpoint has: E_OFF_RATING, E_DEF_RATING, E_NET_RATING, PIE, etc.
  // PIE (Player Impact Estimate) is similar to PER and available here

  console.log(`Got ${rows.length} players. Headers: ${headers.join(', ')}`);

  // Sort by PIE/efficiency descending to get rankings
  const pieIdx = headers.indexOf('PIE');
  const netRatingIdx = headers.indexOf('E_NET_RATING') !== -1 ? headers.indexOf('E_NET_RATING') : headers.indexOf('NET_RATING');

  // Build player data and sort by best metric available
  const players: PlayerData[] = rows.map((row: any[]) => {
    const name = row[playerNameIdx] || '';
    const team = row[teamIdx] || '';
    const pie = pieIdx >= 0 ? row[pieIdx] : null;
    const tsPct = tsIdx >= 0 ? row[tsIdx] : null;
    const netRating = netRatingIdx >= 0 ? row[netRatingIdx] : null;

    const isSengun = name.toLowerCase().includes('sengun') ||
                     name.toLowerCase().includes('şengün') ||
                     name.toLowerCase().includes('alperen');

    // Efficiency index: PIE * TS% as a composite metric
    const efficiencyIndex = pie && tsPct ? parseFloat((pie * tsPct).toFixed(4)) : null;

    return {
      rank: 0, // Will be set after sorting
      player_name: name,
      team,
      per: pie ? parseFloat((pie * 100).toFixed(1)) : null, // PIE is 0-1 range, scale to percentage
      ts_pct: tsPct ? parseFloat((tsPct * 100).toFixed(1)) : null,
      ws: netRating ? parseFloat(netRating.toFixed(1)) : null,
      efficiency_index: efficiencyIndex,
      is_featured_athlete: isSengun,
    };
  });

  // Sort by PER (PIE) descending
  players.sort((a, b) => (b.per || 0) - (a.per || 0));

  // Assign ranks
  players.forEach((p, i) => { p.rank = i + 1; });

  return players;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate authorization
    const authResult = await validateAuth(req);
    if (!authResult.authorized) {
      console.error(`Unauthorized: ${authResult.reason}`);
      return new Response(JSON.stringify({ error: 'Unauthorized', reason: authResult.reason }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    console.log(`Authorized via: ${authResult.reason}`);

    // Check cooldown (30 minutes for Hollinger stats)
    const cooldownResult = await checkCooldown('hollinger_stats', 1800);
    if (!cooldownResult.canRun) {
      console.log(`Cooldown active, skipping. Wait ${cooldownResult.waitSeconds}s`);
      return new Response(JSON.stringify({
        success: true,
        skipped: true,
        reason: 'cooldown',
        waitSeconds: cooldownResult.waitSeconds,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Supabase credentials not configured');
    }

    // Fetch advanced stats from NBA.com (no API key needed)
    const allPlayers = await fetchNbaAdvancedStats();

    // Get top 5 + Sengun
    const sengunData = allPlayers.find(p => p.is_featured_athlete) || null;
    const top5 = allPlayers.slice(0, 5);
    const players = [...top5];

    // Add Sengun if not already in top 5
    if (sengunData && !top5.find(p => p.is_featured_athlete)) {
      players.push(sengunData);
    }

    if (players.length === 0) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Could not parse any players from NBA advanced stats',
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Parsed ${players.length} players for storage (top 5 + Sengun)`);

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: athlete, error: athleteError } = await supabase
      .from('athlete_profiles')
      .select('id')
      .eq('slug', 'alperen-sengun')
      .single();

    if (athleteError) {
      console.error('Could not find Sengun profile:', athleteError);
      throw new Error('Athlete profile not found');
    }

    const athleteId = athlete.id;
    const currentMonth = new Date().toISOString().slice(0, 7) + '-01';

    // Clear old rankings for this month
    const { error: deleteError } = await supabase
      .from('athlete_efficiency_rankings')
      .delete()
      .eq('athlete_id', athleteId)
      .eq('month', currentMonth);

    if (deleteError) {
      console.error('Failed to clear old rankings:', deleteError);
    }

    const rankingsToInsert = players.map(p => ({
      athlete_id: athleteId,
      player_name: p.player_name,
      team: p.team,
      per: p.per,
      ts_pct: p.ts_pct,
      ws: p.ws,
      efficiency_index: p.efficiency_index,
      is_featured_athlete: p.is_featured_athlete,
      month: currentMonth,
    }));

    const { error: insertError } = await supabase
      .from('athlete_efficiency_rankings')
      .insert(rankingsToInsert);

    if (insertError) {
      console.error('Failed to insert rankings:', insertError);
      throw new Error(`Database insert failed: ${insertError.message}`);
    }

    // Log success
    await supabase.from('sync_logs').insert({
      sync_type: 'hollinger_stats',
      status: 'success',
      details: {
        players_synced: players.length,
        month: currentMonth,
        sengun_rank: sengunData?.rank || null,
        sengun_per: sengunData?.per || null,
        source: 'nba.com',
        auth_method: authResult.reason,
      },
    });

    console.log(`Successfully synced ${players.length} players to efficiency rankings (source: NBA.com)`);

    return new Response(JSON.stringify({
      success: true,
      data: {
        source: 'nba.com',
        players_synced: players.length,
        month: currentMonth,
        players: players.map(p => ({ name: p.player_name, rank: p.rank, per: p.per, ts_pct: p.ts_pct })),
      },
      message: 'Advanced stats fetched from NBA.com and synced successfully',
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error fetching advanced stats:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    try {
      const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
      const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
      if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
        await supabase.from('sync_logs').insert({
          sync_type: 'hollinger_stats',
          status: 'error',
          details: { error: errorMessage, source: 'nba.com' },
        });
      }
    } catch (logError) {
      console.error('Failed to log sync error:', logError);
    }

    return new Response(JSON.stringify({
      success: false,
      error: errorMessage,
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

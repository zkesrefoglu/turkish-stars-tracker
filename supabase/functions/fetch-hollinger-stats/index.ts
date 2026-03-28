// Supabase Edge Function: fetch-hollinger-stats
// Uses balldontlie API to compute NBA efficiency rankings (TS%, Game Score, EFF)
// Same API that powers fetch-nba-stats successfully from Supabase

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-webhook-secret',
};

// ---- Inlined auth (cross-directory imports fail in edge function deployment) ----
async function validateAuth(req: Request): Promise<{ authorized: boolean; reason: string }> {
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
  const { data } = await supabase
    .from('sync_logs')
    .select('synced_at')
    .eq('sync_type', syncType)
    .eq('status', 'success')
    .order('synced_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!data) return { canRun: true };
  const elapsed = (Date.now() - new Date(data.synced_at).getTime()) / 1000;
  if (elapsed < cooldownSeconds) return { canRun: false, waitSeconds: Math.ceil(cooldownSeconds - elapsed) };
  return { canRun: true };
}
// ---- End inlined auth ----

const BALLDONTLIE_BASE = 'https://api.balldontlie.io/v1';

// Top NBA performers to track - curated list of likely PER/efficiency leaders
const CANDIDATE_PLAYERS = [
  'Jokic', 'Antetokounmpo', 'Gilgeous-Alexander', 'Doncic', 'Embiid',
  'Davis', 'Towns', 'Tatum', 'Durant', 'James',
  'Mitchell', 'Booker', 'Edwards', 'Brunson', 'Sabonis',
  'Haliburton', 'Fox', 'Wembanyama', 'Sengun', 'Leonard',
];

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function bdlFetch(endpoint: string, apiKey: string): Promise<any> {
  const resp = await fetch(`${BALLDONTLIE_BASE}${endpoint}`, {
    headers: { 'Authorization': apiKey },
  });
  if (!resp.ok) {
    const txt = await resp.text();
    throw new Error(`balldontlie ${resp.status}: ${txt.slice(0, 200)}`);
  }
  return resp.json();
}

// True Shooting %: PTS / (2 * (FGA + 0.44 * FTA))
function calcTS(avg: any): number {
  const denom = 2 * ((avg.fga || 0) + 0.44 * (avg.fta || 0));
  return denom > 0 ? (avg.pts || 0) / denom : 0;
}

// Hollinger Game Score per game:
// GmSc = PTS + 0.4*FGM - 0.7*FGA - 0.4*(FTA-FTM) + 0.7*OREB + 0.3*DREB + STL + 0.7*AST + 0.7*BLK - 0.4*PF - TO
function calcGameScore(avg: any): number {
  return (avg.pts || 0)
    + 0.4 * (avg.fgm || 0)
    - 0.7 * (avg.fga || 0)
    - 0.4 * ((avg.fta || 0) - (avg.ftm || 0))
    + 0.7 * (avg.oreb || 0)
    + 0.3 * (avg.dreb || 0)
    + (avg.stl || 0)
    + 0.7 * (avg.ast || 0)
    + 0.7 * (avg.blk || 0)
    - 0.4 * (avg.pf || 0)
    - (avg.turnover || 0);
}

// EFF per 48 minutes (PER-like scale)
function calcEFF(avg: any): number {
  const min = avg.min ? parseFloat(avg.min) : 0;
  if (min <= 0) return 0;
  const eff = (avg.pts || 0)
    + (avg.reb || 0)
    + (avg.ast || 0)
    + (avg.stl || 0)
    + (avg.blk || 0)
    - ((avg.fga || 0) - (avg.fgm || 0))
    - ((avg.fta || 0) - (avg.ftm || 0))
    - (avg.turnover || 0);
  return (eff / min) * 48;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth
    const authResult = await validateAuth(req);
    if (!authResult.authorized) {
      return new Response(JSON.stringify({ error: 'Unauthorized', reason: authResult.reason }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Cooldown: 3600s (1 hour)
    const cooldownResult = await checkCooldown('hollinger_stats', 3600);
    if (!cooldownResult.canRun) {
      return new Response(JSON.stringify({
        success: true, skipped: true, reason: 'cooldown', waitSeconds: cooldownResult.waitSeconds,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const apiKey = Deno.env.get('BALLDONTLIE_API_KEY');
    if (!apiKey) {
      throw new Error('BALLDONTLIE_API_KEY not configured');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const now = new Date();
    const ss = now.getMonth() + 1 >= 10 ? now.getFullYear() : now.getFullYear() - 1;
    console.log(`[hollinger] Season: ${ss}, source: balldontlie`);

    // Step 1: Search for each candidate player and get their balldontlie ID
    const playerIds: { id: number; name: string; team: string; searchName: string }[] = [];
    const searchErrors: string[] = [];

    for (const name of CANDIDATE_PLAYERS) {
      try {
        const data = await bdlFetch(`/players?search=${encodeURIComponent(name)}&per_page=5`, apiKey);
        if (data.data?.length) {
          const match = data.data[0];
          playerIds.push({
            id: match.id,
            name: `${match.first_name} ${match.last_name}`,
            team: match.team?.abbreviation || '',
            searchName: name,
          });
          console.log(`[hollinger] Found: ${match.first_name} ${match.last_name} (${match.team?.abbreviation})`);
        } else {
          console.log(`[hollinger] No results for: ${name}`);
        }
      } catch (e: any) {
        const msg = `${name}: ${e.message}`;
        console.error(`[hollinger] Search failed - ${msg}`);
        searchErrors.push(msg);
        // If first search fails with auth/rate error, bail early
        if (playerIds.length === 0 && searchErrors.length >= 3) {
          throw new Error(`API failing consistently: ${searchErrors.join('; ')}`);
        }
      }
      // Rate limit: 600ms between requests
      await delay(600);
    }

    console.log(`[hollinger] Found ${playerIds.length}/${CANDIDATE_PLAYERS.length} players`);
    if (playerIds.length < 5) {
      throw new Error(`Only found ${playerIds.length} players (errors: ${searchErrors.join('; ')})`);
    }

    // Step 2: Fetch season averages and calculate metrics
    interface PlayerStat {
      name: string;
      team: string;
      ts: number;
      gameScore: number;
      eff: number;
      gp: number;
      ppg: number;
      isSengun: boolean;
    }
    const playerStats: PlayerStat[] = [];

    for (const p of playerIds) {
      try {
        const data = await bdlFetch(`/season_averages?player_id=${p.id}&season=${ss}`, apiKey);
        const avg = data.data?.[0];
        if (!avg || !avg.games_played || avg.games_played < 10) {
          console.log(`[hollinger] ${p.name}: skipped (${avg?.games_played || 0} GP)`);
          await delay(400);
          continue;
        }

        const ts = calcTS(avg);
        const gs = calcGameScore(avg);
        const eff = calcEFF(avg);
        const isSengun = p.searchName === 'Sengun';

        playerStats.push({ name: p.name, team: p.team, ts, gameScore: gs, eff, gp: avg.games_played, ppg: avg.pts || 0, isSengun });
        console.log(`[hollinger] ${p.name}: GS=${gs.toFixed(1)}, TS=${(ts * 100).toFixed(1)}%, EFF48=${eff.toFixed(1)}`);
      } catch (e: any) {
        console.error(`[hollinger] Season avg failed for ${p.name}: ${e.message}`);
      }
      await delay(400);
    }

    if (!playerStats.length) throw new Error('No player stats retrieved');

    // Step 3: Rank by Game Score, pick top 5 + Sengun
    playerStats.sort((a, b) => b.gameScore - a.gameScore);
    const top5 = playerStats.slice(0, 5);
    const sengun = playerStats.find(p => p.isSengun);
    const players = [...top5];
    if (sengun && !top5.find(p => p.isSengun)) {
      players.push(sengun);
    }

    // Step 4: Get Sengun athlete ID
    const { data: athlete } = await supabase
      .from('athlete_profiles')
      .select('id')
      .eq('slug', 'alperen-sengun')
      .single();

    if (!athlete) throw new Error('Sengun not found in athlete_profiles');
    const aid = athlete.id;
    const mo = now.toISOString().slice(0, 7) + '-01';

    // Step 5: Delete old, insert new
    await supabase
      .from('athlete_efficiency_rankings')
      .delete()
      .eq('athlete_id', aid)
      .eq('month', mo);

    const ins = players.map(x => ({
      athlete_id: aid,
      player_name: x.name,
      team: x.team,
      per: +x.eff.toFixed(1),
      ts_pct: +(x.ts * 100).toFixed(1),
      ws: +x.gameScore.toFixed(1),
      efficiency_index: +(x.gameScore * x.ts).toFixed(4),
      is_featured_athlete: x.isSengun,
      month: mo,
    }));

    const { error: insError } = await supabase
      .from('athlete_efficiency_rankings')
      .insert(ins);

    if (insError) throw new Error(`Insert failed: ${insError.message}`);

    // Step 6: Log success
    const senRank = sengun
      ? (top5.findIndex(p => p.isSengun) + 1 || players.length)
      : null;

    await supabase.from('sync_logs').insert({
      sync_type: 'hollinger_stats',
      status: 'success',
      details: {
        players_synced: players.length,
        month: mo,
        sengun_rank: senRank,
        source: 'balldontlie',
        runtime: 'supabase',
        season: ss,
      },
    });

    console.log(`[hollinger] Done. ${players.length} players synced.`);
    return new Response(JSON.stringify({
      success: true,
      source: 'balldontlie',
      season: ss,
      players_synced: players.length,
      players: players.map((x, i) => ({
        rank: i + 1,
        name: x.name,
        team: x.team,
        gameScore: +x.gameScore.toFixed(1),
        ts_pct: +(x.ts * 100).toFixed(1),
        eff48: +x.eff.toFixed(1),
        gp: x.gp,
      })),
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('[hollinger] Error:', error?.message);

    // Log error to sync_logs
    try {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseKey);
      await supabase.from('sync_logs').insert({
        sync_type: 'hollinger_stats',
        status: 'error',
        details: { error: error?.message || 'Unknown', runtime: 'supabase' },
      });
    } catch (_) {}

    return new Response(JSON.stringify({
      success: false,
      error: error?.message || 'Unknown error',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

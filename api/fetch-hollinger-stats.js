// Vercel Serverless Function: fetch-hollinger-stats
// Uses balldontlie API to fetch NBA advanced stats and calculate efficiency metrics
// Replaces failed NBA.com/ESPN approach (cloud IPs blocked)

const BALLDONTLIE_BASE = 'https://api.balldontlie.io/v1';

// Top NBA performers to track - these are the likely PER leaders each season
// We search by last name to get their balldontlie IDs dynamically
const CANDIDATE_PLAYERS = [
  'Jokic', 'Antetokounmpo', 'Gilgeous-Alexander', 'Doncic', 'Embiid',
  'Davis', 'Towns', 'Tatum', 'Durant', 'James',
  'Mitchell', 'Booker', 'Edwards', 'Brunson', 'Sabonis',
  'Haliburton', 'Fox', 'Wembanyama', 'Sengun', 'Leonard',
];

async function bdlFetch(endpoint, apiKey) {
  const resp = await fetch(`${BALLDONTLIE_BASE}${endpoint}`, {
    headers: { 'Authorization': apiKey },
    signal: AbortSignal.timeout(15000),
  });
  if (!resp.ok) {
    const txt = await resp.text();
    throw new Error(`balldontlie ${resp.status}: ${txt.slice(0, 200)}`);
  }
  return resp.json();
}

// Calculate True Shooting %: PTS / (2 * (FGA + 0.44 * FTA))
function calcTS(avg) {
  const denom = 2 * ((avg.fga || 0) + 0.44 * (avg.fta || 0));
  return denom > 0 ? (avg.pts || 0) / denom : 0;
}

// Calculate Hollinger Game Score (per game):
// GmSc = PTS + 0.4*FGM - 0.7*FGA - 0.4*(FTA-FTM) + 0.7*OREB + 0.3*DREB + STL + 0.7*AST + 0.7*BLK - 0.4*PF - TO
function calcGameScore(avg) {
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

// Simple efficiency rating (EFF) normalized per minute, scaled to ~PER range
// EFF = (PTS + REB + AST + STL + BLK - missed_FG - missed_FT - TO)
function calcEFF(avg) {
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
  // Scale to per-48 (PER-like range): eff/min * 48
  return (eff / min) * 48;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'content-type, x-webhook-secret');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    // Auth
    const secret = process.env.STATS_WEBHOOK_SECRET || 'tst-webhook-2025-secure';
    const provided = req.headers['x-webhook-secret'];
    if (provided !== secret) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const SB_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const BDL_KEY = process.env.BALLDONTLIE_API_KEY;

    if (!SB_URL || !SB_KEY) {
      return res.status(500).json({ error: 'Missing Supabase config' });
    }
    if (!BDL_KEY) {
      return res.status(500).json({ error: 'Missing BALLDONTLIE_API_KEY' });
    }

    // Cooldown: 1800s (30 min)
    const lastR = await fetch(`${SB_URL}/rest/v1/sync_logs?sync_type=eq.hollinger_stats&status=eq.success&order=synced_at.desc&limit=1`, {
      headers: { 'apikey': SB_KEY, 'Authorization': `Bearer ${SB_KEY}` },
    });
    const lastArr = await lastR.json();
    if (lastArr?.[0]) {
      const elapsed = (Date.now() - new Date(lastArr[0].synced_at).getTime()) / 1000;
      if (elapsed < 1800) {
        return res.status(200).json({ skipped: true, waitSeconds: Math.ceil(1800 - elapsed) });
      }
    }

    const now = new Date();
    const ss = now.getMonth() + 1 >= 10 ? now.getFullYear() : now.getFullYear() - 1;
    console.log(`[hollinger] Season: ${ss}, using balldontlie API`);

    // Step 1: Search for each candidate player and get their ID
    const playerIds = [];
    for (const name of CANDIDATE_PLAYERS) {
      try {
        const data = await bdlFetch(`/players?search=${encodeURIComponent(name)}&per_page=5`, BDL_KEY);
        if (data.data?.length) {
          // Pick the first active player match (most relevant)
          const match = data.data[0];
          playerIds.push({
            id: match.id,
            name: `${match.first_name} ${match.last_name}`,
            team: match.team?.abbreviation || '',
            searchName: name,
          });
        }
      } catch (e) {
        console.log(`[hollinger] Search failed for ${name}: ${e.message}`);
      }
    }

    console.log(`[hollinger] Found ${playerIds.length} players`);
    if (playerIds.length < 5) {
      throw new Error(`Only found ${playerIds.length} players, need at least 5`);
    }

    // Step 2: Fetch season averages for each player
    const playerStats = [];
    for (const p of playerIds) {
      try {
        const data = await bdlFetch(`/season_averages?player_id=${p.id}&season=${ss}`, BDL_KEY);
        const avg = data.data?.[0];
        if (!avg || !avg.games_played || avg.games_played < 10) {
          console.log(`[hollinger] ${p.name}: skipped (${avg?.games_played || 0} games)`);
          continue;
        }

        const ts = calcTS(avg);
        const gs = calcGameScore(avg);
        const eff = calcEFF(avg);
        const isSengun = p.searchName === 'Sengun';

        playerStats.push({
          name: p.name,
          team: p.team,
          ts,           // True Shooting %
          gameScore: gs, // Hollinger Game Score per game
          eff,          // EFF per 48 (PER-like)
          gp: avg.games_played,
          ppg: avg.pts || 0,
          isSengun,
        });

        console.log(`[hollinger] ${p.name} (${p.team}): GS=${gs.toFixed(1)}, TS=${(ts*100).toFixed(1)}%, EFF48=${eff.toFixed(1)}, GP=${avg.games_played}`);
      } catch (e) {
        console.log(`[hollinger] Season avg failed for ${p.name}: ${e.message}`);
      }
    }

    if (!playerStats.length) throw new Error('No player stats retrieved');

    // Step 3: Rank by Game Score (Hollinger's own metric), pick top 5 + Sengun
    playerStats.sort((a, b) => b.gameScore - a.gameScore);

    const top5 = playerStats.slice(0, 5);
    const sengun = playerStats.find(p => p.isSengun);
    const players = [...top5];
    if (sengun && !top5.find(p => p.isSengun)) {
      players.push(sengun);
    }

    // Step 4: Get Sengun athlete ID from Supabase
    const athR = await fetch(`${SB_URL}/rest/v1/athlete_profiles?slug=eq.alperen-sengun&select=id&limit=1`, {
      headers: { 'apikey': SB_KEY, 'Authorization': `Bearer ${SB_KEY}` },
    });
    const athArr = await athR.json();
    if (!athArr?.[0]) throw new Error('Sengun not found in athlete_profiles');
    const aid = athArr[0].id;
    const mo = now.toISOString().slice(0, 7) + '-01';

    // Step 5: Delete old rankings for this month, insert new
    await fetch(`${SB_URL}/rest/v1/athlete_efficiency_rankings?athlete_id=eq.${aid}&month=eq.${mo}`, {
      method: 'DELETE',
      headers: { 'apikey': SB_KEY, 'Authorization': `Bearer ${SB_KEY}` },
    });

    const ins = players.map(x => ({
      athlete_id: aid,
      player_name: x.name,
      team: x.team,
      per: +x.eff.toFixed(1),                          // EFF per 48 (PER-like)
      ts_pct: +(x.ts * 100).toFixed(1),                // True Shooting %
      ws: +x.gameScore.toFixed(1),                      // Game Score (repurposing ws column)
      efficiency_index: +(x.gameScore * x.ts).toFixed(4), // composite
      is_featured_athlete: !!x.isSengun,
      month: mo,
    }));

    const insResp = await fetch(`${SB_URL}/rest/v1/athlete_efficiency_rankings`, {
      method: 'POST',
      headers: {
        'apikey': SB_KEY,
        'Authorization': `Bearer ${SB_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify(ins),
    });

    if (!insResp.ok) {
      const errTxt = await insResp.text();
      throw new Error(`Insert failed: ${insResp.status} ${errTxt}`);
    }

    // Step 6: Log success
    const senRank = sengun
      ? (top5.findIndex(p => p.isSengun) + 1 || players.length)
      : null;

    await fetch(`${SB_URL}/rest/v1/sync_logs`, {
      method: 'POST',
      headers: {
        'apikey': SB_KEY,
        'Authorization': `Bearer ${SB_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify({
        sync_type: 'hollinger_stats',
        status: 'success',
        details: {
          players_synced: players.length,
          month: mo,
          sengun_rank: senRank,
          source: 'balldontlie',
          runtime: 'vercel',
          season: ss,
        },
      }),
    });

    console.log(`[hollinger] Done. ${players.length} players synced.`);
    return res.status(200).json({
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
    });

  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown';
    console.error('[hollinger] Error:', msg);
    try {
      const SB_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
      const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
      if (SB_URL && SB_KEY) {
        await fetch(`${SB_URL}/rest/v1/sync_logs`, {
          method: 'POST',
          headers: {
            'apikey': SB_KEY,
            'Authorization': `Bearer ${SB_KEY}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal',
          },
          body: JSON.stringify({
            sync_type: 'hollinger_stats',
            status: 'error',
            details: { error: msg, runtime: 'vercel' },
          }),
        });
      }
    } catch (_) {}
    return res.status(500).json({ success: false, error: msg });
  }
}

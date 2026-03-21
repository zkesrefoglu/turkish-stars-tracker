// Vercel Serverless Function: fetch-hollinger-stats
// Replaces Supabase edge function - NBA.com blocks/throttles from Supabase IPs
export default async function handler(req, res) {
  // CORS
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
    if (!SB_URL || !SB_KEY) {
      return res.status(500).json({ error: 'Missing Supabase config' });
    }

    // Cooldown check
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

    // NBA stats URL
    const now = new Date();
    const ss = now.getMonth() + 1 >= 10 ? now.getFullYear() : now.getFullYear() - 1;
    const season = `${ss}-${String(ss + 1).slice(-2)}`;
    console.log(`[hollinger-vercel] Season: ${season}`);

    const nbaResp = await fetch(
      `https://stats.nba.com/stats/leaguedashplayerstats?Conference=&DateFrom=&DateTo=&Division=&GameScope=&GameSegment=&Height=&LastNGames=0&LeagueID=00&Location=&MeasureType=Advanced&Month=0&OpponentTeamID=0&Outcome=&PORound=0&PaceAdjust=N&PerMode=PerGame&Period=0&PlayerExperience=&PlayerPosition=&PlusMinus=N&Rank=N&Season=${season}&SeasonSegment=&SeasonType=Regular+Season&ShotClockRange=&StarterBench=&TeamID=0&VsConference=&VsDivision=&Weight=`,
      {
        headers: {
          'Accept': 'application/json',
          'Origin': 'https://www.nba.com',
          'Referer': 'https://www.nba.com/',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'x-nba-stats-origin': 'stats',
          'x-nba-stats-token': 'true',
        },
      }
    );

    if (!nbaResp.ok) throw new Error(`NBA API: ${nbaResp.status}`);

    const raw = await nbaResp.json();
    const hdrs = raw.resultSets[0].headers;
    const rows = raw.resultSets[0].rowSet;
    if (!rows.length) throw new Error('Empty NBA response');

    const iN = hdrs.indexOf('PLAYER_NAME');
    const iT = hdrs.indexOf('TEAM_ABBREVIATION');
    const iTS = hdrs.indexOf('TS_PCT');
    const iP = hdrs.indexOf('PIE');
    const iNR = hdrs.indexOf('E_NET_RATING') >= 0 ? hdrs.indexOf('E_NET_RATING') : hdrs.indexOf('NET_RATING');

    console.log(`[hollinger-vercel] ${rows.length} players`);

    // Single pass: top 5 by PIE + find Sengun
    const top = [];
    let sen = null;

    for (const r of rows) {
      const p = r[iP];
      if (!p) continue;
      const n = r[iN] || '';
      const nl = n.toLowerCase();
      const isSen = nl.includes('sengun') || nl.includes('alperen');
      const s = { n, t: r[iT] || '', p, ts: r[iTS] || 0, nr: r[iNR] || 0, sen: isSen };
      if (isSen) sen = s;
      if (top.length < 5) { top.push(s); top.sort((a, b) => b.p - a.p); }
      else if (p > top[4].p) { top[4] = s; top.sort((a, b) => b.p - a.p); }
    }

    const players = [...top];
    if (sen && !top.find(x => x.sen)) players.push(sen);
    if (!players.length) throw new Error('No players');

    // Get Sengun athlete ID
    const athR = await fetch(`${SB_URL}/rest/v1/athlete_profiles?slug=eq.alperen-sengun&select=id&limit=1`, {
      headers: { 'apikey': SB_KEY, 'Authorization': `Bearer ${SB_KEY}` },
    });
    const athArr = await athR.json();
    if (!athArr?.[0]) throw new Error('Sengun not found');
    const aid = athArr[0].id;
    const mo = now.toISOString().slice(0, 7) + '-01';

    // Delete old rankings
    await fetch(`${SB_URL}/rest/v1/athlete_efficiency_rankings?athlete_id=eq.${aid}&month=eq.${mo}`, {
      method: 'DELETE', headers: { 'apikey': SB_KEY, 'Authorization': `Bearer ${SB_KEY}` },
    });

    // Insert new
    const ins = players.map(x => ({
      athlete_id: aid, player_name: x.n, team: x.t,
      per: +(x.p * 100).toFixed(1), ts_pct: +(x.ts * 100).toFixed(1),
      ws: +x.nr.toFixed(1), efficiency_index: +(x.p * x.ts).toFixed(4),
      is_featured_athlete: x.sen, month: mo,
    }));

    await fetch(`${SB_URL}/rest/v1/athlete_efficiency_rankings`, {
      method: 'POST',
      headers: { 'apikey': SB_KEY, 'Authorization': `Bearer ${SB_KEY}`, 'Content-Type': 'application/json', 'Prefer': 'return=minimal' },
      body: JSON.stringify(ins),
    });

    // Log success
    const senRank = sen ? (top.findIndex(x => x.sen) + 1 || players.length) : null;
    await fetch(`${SB_URL}/rest/v1/sync_logs`, {
      method: 'POST',
      headers: { 'apikey': SB_KEY, 'Authorization': `Bearer ${SB_KEY}`, 'Content-Type': 'application/json', 'Prefer': 'return=minimal' },
      body: JSON.stringify({ sync_type: 'hollinger_stats', status: 'success', details: { players_synced: players.length, month: mo, sengun_rank: senRank, source: 'nba.com', runtime: 'vercel' } }),
    });

    console.log(`[hollinger-vercel] Done. ${players.length} synced.`);
    return res.status(200).json({
      success: true, source: 'nba.com', players_synced: players.length,
      players: players.map((x, i) => ({ rank: i + 1, name: x.n, per: +(x.p * 100).toFixed(1) })),
    });

  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown';
    console.error('[hollinger-vercel] Error:', msg);
    try {
      const SB_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
      const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
      if (SB_URL && SB_KEY) {
        await fetch(`${SB_URL}/rest/v1/sync_logs`, {
          method: 'POST',
          headers: { 'apikey': SB_KEY, 'Authorization': `Bearer ${SB_KEY}`, 'Content-Type': 'application/json', 'Prefer': 'return=minimal' },
          body: JSON.stringify({ sync_type: 'hollinger_stats', status: 'error', details: { error: msg, source: 'nba.com', runtime: 'vercel' } }),
        });
      }
    } catch (_) {}
    return res.status(500).json({ success: false, error: msg });
  }
}

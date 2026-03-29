import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ============================================================================
// LEAGUE ID MAP — verified against API-Football
// Keys must match athlete_profiles.league exactly
// ============================================================================
const LEAGUE_IDS: Record<string, number> = {
  // Senior leagues
  'EPL':                     39,   // England (Premier League)
  'Championship':            40,   // England
  'La Liga':                140,   // Spain
  'Serie A':                135,   // Italy
  'Bundesliga':              78,   // Germany
  '2. Bundesliga':           79,   // Germany
  'Ligue 1':                 61,   // France
  'Eredivisie':              88,   // Netherlands
  'Jupiler Pro League':     144,   // Belgium
  'Challenger Pro League':  145,   // Belgium
  '1ste Nationale VV':      506,   // Belgium D3
  'Super Lig':              203,   // Turkey
  'Liga Portugal':           94,   // Portugal
  'Superliga':              120,   // Denmark
  'Super League 1':         197,   // Greece
  'Swiss Super League':     207,   // Switzerland
  'Saudi Pro League':       307,   // Saudi Arabia
  'UAE Pro League':         218,   // UAE
  'Russian Premier League': 384,   // Russia
  'Premyer Liqa':           235,   // Azerbaijan
  'J1 100 Year Vision League': 98, // Japan (J1 League)
  '2. Liga':                 14,   // Austria
  // Austria Bundesliga — needs special key to avoid clash with Germany
  'Austrian Bundesliga':     13,   // Austria (alias handled below)

  // Youth / regional — may or may not have standings
  'Championnat National U19': 529, // France U19
  'Regionalliga Bayern':     283,  // Germany regional
  'U19 DFB-Nachwuchsliga':    0,   // No API-Football coverage
  'U17 DFB-Nachwuchsliga':    0,   // No API-Football coverage
  'O19 Division 1':            0,   // No API-Football coverage
};

// Some athlete_profiles rows store "Bundesliga" for both Germany and Austria.
// We resolve this by checking the team's country in the frontend.
// But we also support legacy/alias lookups:
const LEAGUE_ALIASES: Record<string, string> = {
  'Premier League': 'EPL',          // legacy: disambiguate from Russian
  'LaLiga':         'La Liga',
  'Super Lig':      'Super Lig',
  'Primeira Liga':  'Liga Portugal',
  'Seria A':        'Serie A',
  'Super League':   'Superliga',    // legacy: was used for Denmark
};

// Cache duration: 7 days in milliseconds
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

interface TeamStanding {
  rank: number;
  teamId: number;
  teamName: string;
  teamLogo: string;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDiff: number;
  points: number;
  form: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { league } = await req.json();

    if (!league) {
      return new Response(
        JSON.stringify({ error: 'League parameter required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Resolve aliases
    const resolvedLeague = LEAGUE_ALIASES[league] || league;
    const leagueId = LEAGUE_IDS[resolvedLeague];

    if (leagueId === undefined) {
      return new Response(
        JSON.stringify({ error: `Unknown league: ${league}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Youth/regional leagues with no API coverage
    if (leagueId === 0) {
      return new Response(
        JSON.stringify({ success: true, standings: [], league: resolvedLeague, cached: false, message: 'No standings available for this league' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get current season year
    const now = new Date();
    const season = now.getMonth() >= 7 ? now.getFullYear() : now.getFullYear() - 1;

    // ---- Check cache first ----
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: cached } = await supabase
      .from('league_standings')
      .select('standings, fetched_at')
      .eq('league', resolvedLeague)
      .eq('season', season)
      .maybeSingle();

    if (cached) {
      const age = now.getTime() - new Date(cached.fetched_at).getTime();
      if (age < CACHE_TTL_MS) {
        console.log(`Cache hit for ${resolvedLeague} (age: ${Math.round(age / 3600000)}h)`);
        return new Response(
          JSON.stringify({
            success: true,
            standings: cached.standings,
            league: resolvedLeague,
            season,
            cached: true,
            lastUpdated: cached.fetched_at,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      console.log(`Cache stale for ${resolvedLeague} (age: ${Math.round(age / 3600000)}h), refreshing`);
    }

    // ---- Fetch fresh from API-Football ----
    const apiKey = Deno.env.get('API_FOOTBALL_KEY');
    if (!apiKey) {
      // If no API key but we have stale cache, return stale data
      if (cached) {
        console.log('No API key, returning stale cache');
        return new Response(
          JSON.stringify({
            success: true,
            standings: cached.standings,
            league: resolvedLeague,
            season,
            cached: true,
            stale: true,
            lastUpdated: cached.fetched_at,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      return new Response(
        JSON.stringify({ error: 'API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Fetching standings for ${resolvedLeague} (ID: ${leagueId}), season ${season}`);

    const response = await fetch(
      `https://v3.football.api-sports.io/standings?league=${leagueId}&season=${season}`,
      { headers: { 'x-apisports-key': apiKey } }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('API-Football error:', response.status, errorText);
      // Return stale cache if API fails
      if (cached) {
        return new Response(
          JSON.stringify({
            success: true,
            standings: cached.standings,
            league: resolvedLeague,
            season,
            cached: true,
            stale: true,
            lastUpdated: cached.fetched_at,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      throw new Error(`API-Football error: ${response.status}`);
    }

    const data = await response.json();

    if (!data.response?.[0]?.league?.standings?.[0]) {
      console.log('No standings data in API response');
      return new Response(
        JSON.stringify({ success: true, standings: [], league: resolvedLeague }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const rawStandings = data.response[0].league.standings[0];

    const standings: TeamStanding[] = rawStandings.map((team: any) => ({
      rank: team.rank,
      teamId: team.team.id,
      teamName: team.team.name,
      teamLogo: team.team.logo,
      played: team.all.played,
      wins: team.all.win,
      draws: team.all.draw,
      losses: team.all.lose,
      goalsFor: team.all.goals.for,
      goalsAgainst: team.all.goals.against,
      goalDiff: team.goalsDiff,
      points: team.points,
      form: team.form || '',
    }));

    console.log(`Fetched ${standings.length} teams for ${resolvedLeague}`);

    // ---- Update cache ----
    const { error: upsertError } = await supabase
      .from('league_standings')
      .upsert(
        {
          league: resolvedLeague,
          season,
          standings,
          fetched_at: now.toISOString(),
        },
        { onConflict: 'league,season' }
      );

    if (upsertError) {
      console.error('Cache upsert error:', upsertError);
      // Non-fatal — still return the data
    } else {
      console.log(`Cached standings for ${resolvedLeague}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        standings,
        league: resolvedLeague,
        season,
        cached: false,
        lastUpdated: now.toISOString(),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error fetching football standings:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

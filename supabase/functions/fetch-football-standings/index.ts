import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// League IDs for API-Football
const LEAGUE_IDS: Record<string, number> = {
  'La Liga': 140,
  'LaLiga': 140,
  'Premier League': 39,
  'Serie A': 135,
  'Bundesliga': 78,
  'Ligue 1': 61,
  'Süper Lig': 203,
  'Super Lig': 203,
  'Primeira Liga': 94,
  'Saudi Pro League': 307,
};

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

    const apiKey = Deno.env.get('API_FOOTBALL_KEY');
    if (!apiKey) {
      console.error('API_FOOTBALL_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const leagueId = LEAGUE_IDS[league];
    if (!leagueId) {
      return new Response(
        JSON.stringify({ error: `Unknown league: ${league}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get current season year
    const now = new Date();
    const season = now.getMonth() >= 7 ? now.getFullYear() : now.getFullYear() - 1;

    console.log(`Fetching standings for ${league} (ID: ${leagueId}), season ${season}`);

    const response = await fetch(
      `https://v3.football.api-sports.io/standings?league=${leagueId}&season=${season}`,
      {
        headers: {
          'x-apisports-key': apiKey,
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('API-Football error:', response.status, errorText);
      throw new Error(`API-Football error: ${response.status}`);
    }

    const data = await response.json();
    
    if (!data.response?.[0]?.league?.standings?.[0]) {
      console.log('No standings data found');
      return new Response(
        JSON.stringify({ success: true, standings: [], league }),
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

    console.log(`Fetched ${standings.length} teams for ${league}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        standings,
        league,
        season,
        lastUpdated: new Date().toISOString(),
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

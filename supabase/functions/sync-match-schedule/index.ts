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
  'Lille': 79,
  'Eintracht Frankfurt': 169,
};

interface UpcomingFixture {
  athlete_id: string;
  opponent: string;
  competition: string;
  match_date: string;
  home_away: 'home' | 'away';
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

  return await response.json();
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate authorization
    const webhookSecret = req.headers.get('x-webhook-secret');
    const expectedSecret = Deno.env.get('STATS_WEBHOOK_SECRET');
    const authHeader = req.headers.get('authorization');
    
    const hasValidWebhookSecret = expectedSecret && webhookSecret === expectedSecret;
    const hasAuthHeader = authHeader && authHeader.startsWith('Bearer ');
    
    if (!hasValidWebhookSecret && !hasAuthHeader) {
      console.error('Unauthorized: Invalid or missing webhook secret and no auth header');
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const apiKey = Deno.env.get('API_FOOTBALL_KEY');
    if (!apiKey) {
      throw new Error('API_FOOTBALL_KEY not configured');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get football athletes and their teams
    const { data: athletes, error: athletesError } = await supabase
      .from('athlete_profiles')
      .select('id, name, team, sport')
      .eq('sport', 'football');

    if (athletesError) {
      throw new Error(`Failed to fetch athletes: ${athletesError.message}`);
    }

    console.log(`Found ${athletes?.length || 0} football athletes`);

    // Get unique team IDs
    const uniqueTeams = [...new Set(athletes?.map(a => a.team).filter(t => TEAM_IDS[t]))];
    console.log(`Fetching schedules for teams: ${uniqueTeams.join(', ')}`);

    const allUpcomingMatches: UpcomingFixture[] = [];
    const today = new Date();
    const sevenDaysFromNow = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);

    // Fetch upcoming fixtures for each team
    for (const teamName of uniqueTeams) {
      const teamId = TEAM_IDS[teamName];
      if (!teamId) continue;

      // Get next 10 fixtures for this team
      const fixturesData = await fetchApiFootball(`/fixtures?team=${teamId}&next=10`, apiKey);
      
      if (!fixturesData?.response) {
        console.log(`No fixtures found for team ${teamName}`);
        continue;
      }

      console.log(`Found ${fixturesData.response.length} upcoming fixtures for ${teamName}`);

      // Find athletes on this team
      const teamAthletes = athletes?.filter(a => a.team === teamName) || [];

      for (const fixture of fixturesData.response) {
        const kickoff = new Date(fixture.fixture.date);
        
        // Only include fixtures within the next 7 days
        if (kickoff > sevenDaysFromNow) {
          continue;
        }

        const homeTeam = fixture.teams.home;
        const awayTeam = fixture.teams.away;
        const isHome = homeTeam.id === teamId;
        const opponent = isHome ? awayTeam.name : homeTeam.name;
        const competition = fixture.league?.name || 'Unknown';

        // Create an upcoming match entry for each athlete on this team
        for (const athlete of teamAthletes) {
          allUpcomingMatches.push({
            athlete_id: athlete.id,
            opponent,
            competition,
            match_date: fixture.fixture.date,
            home_away: isHome ? 'home' : 'away',
          });
        }
      }
    }

    console.log(`Total upcoming matches to sync: ${allUpcomingMatches.length}`);

    // Clear old upcoming matches (matches in the past)
    const { error: deleteError } = await supabase
      .from('athlete_upcoming_matches')
      .delete()
      .lt('match_date', today.toISOString());

    if (deleteError) {
      console.error('Error deleting old matches:', deleteError);
    } else {
      console.log('Deleted past matches from schedule');
    }

    // Upsert all upcoming matches
    if (allUpcomingMatches.length > 0) {
      // First, clear all existing upcoming matches to avoid duplicates
      const athleteIds = [...new Set(allUpcomingMatches.map(m => m.athlete_id))];
      
      for (const athleteId of athleteIds) {
        await supabase
          .from('athlete_upcoming_matches')
          .delete()
          .eq('athlete_id', athleteId);
      }

      // Insert new upcoming matches
      const { error: insertError } = await supabase
        .from('athlete_upcoming_matches')
        .insert(allUpcomingMatches);

      if (insertError) {
        console.error('Error inserting upcoming matches:', insertError);
        throw new Error(`Failed to insert upcoming matches: ${insertError.message}`);
      }

      console.log(`Successfully synced ${allUpcomingMatches.length} upcoming matches`);
    }

    // Log the sync
    await supabase.from('sync_logs').insert({
      sync_type: 'match_schedule',
      status: 'success',
      details: {
        teams_synced: uniqueTeams.length,
        matches_synced: allUpcomingMatches.length,
      },
    });

    return new Response(JSON.stringify({
      success: true,
      message: `Synced ${allUpcomingMatches.length} upcoming matches for ${uniqueTeams.length} teams`,
      teams: uniqueTeams,
      matchCount: allUpcomingMatches.length,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in sync-match-schedule:', error);
    return new Response(JSON.stringify({ 
      error: errorMessage,
      success: false 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

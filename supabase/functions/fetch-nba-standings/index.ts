import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const BALLDONTLIE_BASE_URL = 'https://api.balldontlie.io/v1';

// NBA team IDs in BallDontLie API - Western Conference only
const WESTERN_TEAMS = [
  { id: 7, name: 'Mavericks', city: 'Dallas', abbr: 'DAL', division: 'Southwest' },
  { id: 8, name: 'Nuggets', city: 'Denver', abbr: 'DEN', division: 'Northwest' },
  { id: 10, name: 'Warriors', city: 'Golden State', abbr: 'GSW', division: 'Pacific' },
  { id: 11, name: 'Rockets', city: 'Houston', abbr: 'HOU', division: 'Southwest' },
  { id: 12, name: 'Clippers', city: 'LA', abbr: 'LAC', division: 'Pacific' },
  { id: 13, name: 'Lakers', city: 'Los Angeles', abbr: 'LAL', division: 'Pacific' },
  { id: 15, name: 'Grizzlies', city: 'Memphis', abbr: 'MEM', division: 'Southwest' },
  { id: 16, name: 'Timberwolves', city: 'Minnesota', abbr: 'MIN', division: 'Northwest' },
  { id: 18, name: 'Pelicans', city: 'New Orleans', abbr: 'NOP', division: 'Southwest' },
  { id: 21, name: 'Thunder', city: 'Oklahoma City', abbr: 'OKC', division: 'Northwest' },
  { id: 24, name: 'Suns', city: 'Phoenix', abbr: 'PHX', division: 'Pacific' },
  { id: 25, name: 'Trail Blazers', city: 'Portland', abbr: 'POR', division: 'Northwest' },
  { id: 26, name: 'Kings', city: 'Sacramento', abbr: 'SAC', division: 'Pacific' },
  { id: 27, name: 'Spurs', city: 'San Antonio', abbr: 'SAS', division: 'Southwest' },
  { id: 29, name: 'Jazz', city: 'Utah', abbr: 'UTA', division: 'Northwest' },
];

interface TeamStanding {
  teamId: number;
  name: string;
  city: string;
  abbr: string;
  division: string;
  wins: number;
  losses: number;
  winPct: number;
  gamesBehind: number;
  streak: string;
  last10: string;
  homeRecord: string;
  awayRecord: string;
}

async function fetchWithAuth(url: string, apiKey: string): Promise<any> {
  console.log(`Fetching: ${url}`);
  
  const response = await fetch(url, {
    headers: {
      'Authorization': apiKey,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`Balldontlie API error: ${response.status}`, errorText);
    throw new Error(`Balldontlie API error: ${response.status} - ${errorText}`);
  }

  return response.json();
}

async function fetchAllGames(apiKey: string): Promise<any[]> {
  const allGames: any[] = [];
  const seasonStartYear = new Date().getMonth() >= 9 ? new Date().getFullYear() : new Date().getFullYear() - 1;
  const startDate = `${seasonStartYear}-10-01`;
  const endDate = new Date().toISOString().split('T')[0];
  
  let cursor: string | null = null;
  let page = 0;
  const maxPages = 20; // Safety limit
  
  while (page < maxPages) {
    const url = cursor 
      ? `${BALLDONTLIE_BASE_URL}/games?start_date=${startDate}&end_date=${endDate}&per_page=100&cursor=${cursor}`
      : `${BALLDONTLIE_BASE_URL}/games?start_date=${startDate}&end_date=${endDate}&per_page=100`;
    
    const data = await fetchWithAuth(url, apiKey);
    
    // Only add Final games
    const finalGames = (data.data || []).filter((g: any) => g.status === 'Final');
    allGames.push(...finalGames);
    
    cursor = data.meta?.next_cursor;
    if (!cursor) break;
    page++;
  }
  
  console.log(`Fetched ${allGames.length} completed games across ${page + 1} pages`);
  return allGames;
}

function calculateStandings(games: any[]): TeamStanding[] {
  const teamStats: Map<number, {
    wins: number;
    losses: number;
    homeWins: number;
    homeLosses: number;
    awayWins: number;
    awayLosses: number;
    recentResults: boolean[]; // true = win
    currentStreak: { type: 'W' | 'L'; count: number };
  }> = new Map();
  
  // Initialize all Western teams
  WESTERN_TEAMS.forEach(team => {
    teamStats.set(team.id, {
      wins: 0,
      losses: 0,
      homeWins: 0,
      homeLosses: 0,
      awayWins: 0,
      awayLosses: 0,
      recentResults: [],
      currentStreak: { type: 'W', count: 0 },
    });
  });
  
  // Sort games by date to properly track streaks
  const sortedGames = [...games].sort((a, b) => 
    new Date(a.date).getTime() - new Date(b.date).getTime()
  );
  
  // Process each game
  for (const game of sortedGames) {
    const homeTeamId = game.home_team.id;
    const awayTeamId = game.visitor_team.id;
    const homeScore = game.home_team_score;
    const awayScore = game.visitor_team_score;
    
    const homeWon = homeScore > awayScore;
    
    // Update home team stats
    const homeStats = teamStats.get(homeTeamId);
    if (homeStats) {
      if (homeWon) {
        homeStats.wins++;
        homeStats.homeWins++;
      } else {
        homeStats.losses++;
        homeStats.homeLosses++;
      }
      homeStats.recentResults.push(homeWon);
      if (homeStats.recentResults.length > 10) {
        homeStats.recentResults.shift();
      }
      // Update streak
      if (homeStats.currentStreak.type === (homeWon ? 'W' : 'L')) {
        homeStats.currentStreak.count++;
      } else {
        homeStats.currentStreak = { type: homeWon ? 'W' : 'L', count: 1 };
      }
    }
    
    // Update away team stats
    const awayStats = teamStats.get(awayTeamId);
    if (awayStats) {
      if (!homeWon) {
        awayStats.wins++;
        awayStats.awayWins++;
      } else {
        awayStats.losses++;
        awayStats.awayLosses++;
      }
      awayStats.recentResults.push(!homeWon);
      if (awayStats.recentResults.length > 10) {
        awayStats.recentResults.shift();
      }
      // Update streak
      if (awayStats.currentStreak.type === (!homeWon ? 'W' : 'L')) {
        awayStats.currentStreak.count++;
      } else {
        awayStats.currentStreak = { type: !homeWon ? 'W' : 'L', count: 1 };
      }
    }
  }
  
  // Build standings array
  const standings: TeamStanding[] = WESTERN_TEAMS.map(team => {
    const stats = teamStats.get(team.id)!;
    const totalGames = stats.wins + stats.losses;
    const last10Wins = stats.recentResults.filter(r => r).length;
    const last10Losses = stats.recentResults.length - last10Wins;
    
    return {
      teamId: team.id,
      name: team.name,
      city: team.city,
      abbr: team.abbr,
      division: team.division,
      wins: stats.wins,
      losses: stats.losses,
      winPct: totalGames > 0 ? stats.wins / totalGames : 0,
      gamesBehind: 0, // Will calculate after sorting
      streak: `${stats.currentStreak.type}${stats.currentStreak.count}`,
      last10: `${last10Wins}-${last10Losses}`,
      homeRecord: `${stats.homeWins}-${stats.homeLosses}`,
      awayRecord: `${stats.awayWins}-${stats.awayLosses}`,
    };
  });
  
  // Sort by win percentage (descending)
  standings.sort((a, b) => b.winPct - a.winPct);
  
  // Calculate games behind
  const topTeam = standings[0];
  standings.forEach(team => {
    const gb = ((topTeam.wins - team.wins) + (team.losses - topTeam.losses)) / 2;
    team.gamesBehind = Math.max(0, gb);
  });
  
  return standings;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get('BALLDONTLIE_API_KEY');
    
    if (!apiKey) {
      console.error('BALLDONTLIE_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Fetching NBA games for standings calculation...');
    
    // Fetch all completed games this season
    const games = await fetchAllGames(apiKey);
    
    // Calculate standings
    const standings = calculateStandings(games);
    
    console.log(`Calculated standings for ${standings.length} Western Conference teams`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        standings,
        gamesProcessed: games.length,
        lastUpdated: new Date().toISOString(),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error fetching NBA standings:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

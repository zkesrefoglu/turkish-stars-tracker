import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-webhook-secret',
};

// ---- Inlined auth (cross-directory imports fail in Supabase edge function deployment) ----
async function validateAuth(req: Request): Promise<{ authorized: boolean; reason: string; userId?: string }> {
  const webhookSecret = Deno.env.get('STATS_WEBHOOK_SECRET');
  const providedSecret = req.headers.get('x-webhook-secret');
  const authHeader = req.headers.get('authorization');
  if (providedSecret) {
    if (!webhookSecret) return { authorized: false, reason: 'STATS_WEBHOOK_SECRET not configured' };
    if (providedSecret === webhookSecret) return { authorized: true, reason: 'webhook_secret' };
    return { authorized: false, reason: 'Invalid webhook secret' };
  }
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.replace('Bearer ', '');
    if (token.length < 100 || token === 'fake' || token === 'test') return { authorized: false, reason: 'Invalid token format' };
    try {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseAnonKey, { global: { headers: { Authorization: `Bearer ${token}` } } });
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) return { authorized: false, reason: 'Invalid or expired token' };
      const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const adminClient = createClient(supabaseUrl, serviceRoleKey);
      const { data: roleData } = await adminClient.from('user_roles').select('role').eq('user_id', user.id).eq('role', 'admin').maybeSingle();
      if (!roleData) return { authorized: false, reason: 'User is not an admin', userId: user.id };
      return { authorized: true, reason: 'admin_user', userId: user.id };
    } catch (_) { return { authorized: false, reason: 'Auth validation error' }; }
  }
  return { authorized: false, reason: 'Missing authentication' };
}

async function checkCooldown(syncType: string, cooldownSeconds: number): Promise<{ canRun: boolean; lastRun?: Date; waitSeconds?: number }> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, serviceRoleKey);
  const { data, error } = await supabase.from('sync_logs').select('synced_at').eq('sync_type', syncType).eq('status', 'success').order('synced_at', { ascending: false }).limit(1).maybeSingle();
  if (error) return { canRun: true };
  if (!data) return { canRun: true };
  const lastRun = new Date(data.synced_at);
  const elapsedSeconds = (Date.now() - lastRun.getTime()) / 1000;
  if (elapsedSeconds < cooldownSeconds) return { canRun: false, lastRun, waitSeconds: Math.ceil(cooldownSeconds - elapsedSeconds) };
  return { canRun: true, lastRun };
}
// ---- End inlined auth ----

const API_FOOTBALL_BASE = 'https://v3.football.api-sports.io';

// Auto-detect season: European football seasons span Aug-May
// If we're in Aug+ of year Y, the season is Y (i.e. Y/Y+1)
// If we're in Jan-Jul of year Y, the season is Y-1 (i.e. Y-1/Y)
function getCurrentSeason(): number {
  const now = new Date();
  const month = now.getMonth() + 1; // 1-indexed
  const year = now.getFullYear();
  return month >= 8 ? year : year - 1;
}

const CURRENT_SEASON = getCurrentSeason();

// Team IDs
const TEAM_IDS: Record<string, number> = {
  'Real Madrid': 541,
  'Juventus': 496,
  'Brighton': 51,
  'Brighton & Hove Albion': 51,
  'Eintracht Frankfurt': 169,
  'Lille': 79,
  'Udinese': 494,
  'Inter Milan': 505,
  'Inter': 505,
  'Cagliari': 490,
  'Cagliari Calcio': 490,
  'Bournemouth': 35,
  'AS Roma': 497,
  'Al-Ahli': 2932,
  'Al Ahli': 2932,
  'Al-Ahli Saudi': 2932,
  'Al-Hilal': 2939,
  'Al Hilal': 2939,
  'Al-Hilal Saudi': 2939,
  'Manchester United': 33,
  'Man United': 33,
  'Man Utd': 33,
  'VfB Stuttgart': 157,
  'Stuttgart': 157,
  'Borussia Dortmund': 165,
  'Dortmund': 165,
  'BVB': 165,
  'FC Porto': 212,
  'Porto': 212,
  'Pisa': 520,
  'AC Pisa': 520,
  'Torino': 503,
  'Torino FC': 503,
  // New teams - March 2026
  'TSG 1899 Hoffenheim': 167,
  'Hoffenheim': 167,
  'TSG Hoffenheim': 167,
  'NEC Nijmegen': 413,
  'NEC': 413,
  '1. FC Nürnberg': 162,
  'Nürnberg': 162,
  'FC Nürnberg': 162,
  'SC Braga': 217,
  'Braga': 217,
  '1.FC Union Berlin': 182,
  'Union Berlin': 182,
  'FC Union Berlin': 182,
  'FC Schalke 04': 174,
  'Schalke 04': 174,
  'Schalke': 174,
  'FC Augsburg': 170,
  'Augsburg': 170,
  'Arminia Bielefeld': 188,
  'Bielefeld': 188,
  'SK Rapid Wien': 781,
  'Rapid Wien': 781,
  'Hannover 96': 180,
  'Hannover': 180,
  'Olympique Lyon': 80,
  'Lyon': 80,
  'VfL Wolfsburg': 161,
  'Wolfsburg': 161,
  'PSV Eindhoven': 148,
  'PSV': 148,
  'Ajax Amsterdam': 194,
  'Ajax': 194,
  'Bayer 04 Leverkusen': 168,
  'Leverkusen': 168,
  '1.FC Köln': 192,
  'FC Köln': 192,
  'Köln': 192,
  '1.FC Kaiserslautern': 164,
  'Kaiserslautern': 164,
  'Karlsruher SC': 163,
  'Karlsruher': 163,
  'FC Thun': 615,
  // ASCII aliases for existing teams
  '1. FC Nurnberg': 162,
  'Nurnberg': 162,
  '1.FC Koln': 192,
  'FC Koln': 192,
  'Koln': 192,
  // New teams - March 2026 batch 2 (IDs verified against API)
  'Olympiacos Piraeus': 553,
  'Olympiacos': 553,
  'Olympiakos': 553,
  'FC Midtjylland': 397,
  'Midtjylland': 397,
  'KVC Westerlo': 261,
  'Westerlo': 261,
  'Oxford United': 1338,
  'Oxford': 1338,
  'Eintracht Braunschweig': 744,
  'Braunschweig': 744,
  'Heracles Almelo': 206,
  'Heracles': 206,
  'FC Utrecht': 207,
  'Utrecht': 207,
  '1.FC Heidenheim 1846': 180,
  '1.FC Heidenheim': 180,
  'Heidenheim': 180,
  'Gamba Osaka': 293,
  'KV Mechelen': 266,
  'Mechelen': 266,
  'Zulte Waregem': 600,
  'Beerschot VA': 263,
  'Beerschot': 263,
  'Rapid Vienna': 781,
  'Al-Nasr SC': 10155,
  'Al Nasr': 10155,
  'Al-Jazira Club': 2871,
  'Al-Jazira': 2871,
  'Al Jazira': 2871,
  'FC Orenburg': 1080,
  'Orenburg': 1080,
  'Zira FC': 648,
  'Zira': 648,
};

// Player name mappings for Turkish characters
const PLAYER_NAME_VARIANTS: Record<string, string[]> = {
  'Arda Guler': ['Arda Güler', 'Güler', 'Guler', 'A. Güler'],
  'Arda Güler': ['Arda Guler', 'Güler', 'Guler', 'A. Güler'],
  'Kenan Yildiz': ['Kenan Yıldız', 'Yıldız', 'Yildiz', 'K. Yıldız'],
  'Kenan Yıldız': ['Kenan Yildiz', 'Yıldız', 'Yildiz', 'K. Yıldız'],
  'Ferdi Kadioglu': ['Ferdi Kadıoğlu', 'Kadıoğlu', 'Kadioglu', 'F. Kadıoğlu'],
  'Ferdi Kadıoğlu': ['Ferdi Kadioglu', 'Kadıoğlu', 'Kadioglu', 'F. Kadıoğlu'],
  'Can Uzun': ['Can Uzun', 'Uzun', 'C. Uzun'],
  'Berke Ozer': ['Berke Özer', 'Özer', 'Ozer', 'B. Özer'],
  'Berke Özer': ['Berke Ozer', 'Özer', 'Ozer', 'B. Özer'],
  'Hakan Calhanoglu': ['Hakan Çalhanoğlu', 'Çalhanoğlu', 'Calhanoglu', 'H. Çalhanoğlu'],
  'Hakan Çalhanoğlu': ['Hakan Calhanoglu', 'Çalhanoğlu', 'Calhanoglu', 'H. Çalhanoğlu'],
  'Semih Kılıçsoy': ['Semih Kilicsoy', 'Kılıçsoy', 'Kilicsoy', 'S. Kılıçsoy'],
  'Enes Ünal': ['Enes Unal', 'Ünal', 'Unal', 'E. Ünal'],
  'Zeki Çelik': ['Zeki Celik', 'Çelik', 'Celik', 'Z. Çelik'],
  'Merih Demiral': ['Merih Demiral', 'Demiral', 'M. Demiral'],
  'Yusuf Akçiçek': ['Yusuf Akcicek', 'Akçiçek', 'Akcicek', 'Y. Akçiçek'],
  'Altay Bayındır': ['Altay Bayindir', 'Bayındır', 'Bayindir', 'A. Bayındır'],
  'Atakan Karazor': ['Atakan Karazor', 'Karazor', 'A. Karazor'],
  'Salih Özcan': ['Salih Ozcan', 'Özcan', 'Ozcan', 'S. Özcan'],
  'İsak Vural': ['Isak Vural', 'Vural', 'I. Vural'],
  'Deniz Gül': ['Deniz Gul', 'Gül', 'Gul', 'D. Gül'],
  'Emirhan İlkhan': ['Emirhan Ilkhan', 'İlkhan', 'Ilkhan', 'E. İlkhan', 'E. Ilkhan'],
  'Emirhan Ilkhan': ['Emirhan İlkhan', 'İlkhan', 'Ilkhan', 'E. İlkhan', 'E. Ilkhan'],
  // New athletes - March 2026
  'Ozan Kabak': ['Ozan Kabak', 'Kabak', 'O. Kabak'],
  'Ahmetcan Kaplan': ['Ahmetcan Kaplan', 'Kaplan', 'A. Kaplan'],
  'Berkay Yılmaz': ['Berkay Yilmaz', 'Yılmaz', 'Yilmaz', 'B. Yılmaz'],
  'Demir Ege Tıknaz': ['Demir Ege Tiknaz', 'Tıknaz', 'Tiknaz', 'D. Tıknaz', 'Ege Tıknaz', 'Ege Tiknaz'],
  'Livan Burcu': ['Livan Burcu', 'Burcu', 'L. Burcu'],
  'Mertcan Ayhan': ['Mertcan Ayhan', 'Ayhan', 'M. Ayhan'],
  'Başar Önal': ['Basar Onal', 'Önal', 'Onal', 'B. Önal'],
  'Mert Kömür': ['Mert Komur', 'Kömür', 'Komur', 'M. Kömür'],
  'Taylan Bulut': ['Taylan Bulut', 'Bulut', 'T. Bulut'],
  'Deniz Ofli': ['Deniz Ofli', 'Ofli', 'D. Ofli'],
  'Eyyüb Yaşar': ['Eyyub Yasar', 'Yaşar', 'Yasar', 'E. Yaşar'],
  'Emirhan Altundağ': ['Emirhan Altundag', 'Altundağ', 'Altundag', 'E. Altundağ'],
  'Haktan Şener': ['Haktan Sener', 'Şener', 'Sener', 'H. Şener'],
  'Darwin Soylu': ['Darwin Soylu', 'Soylu', 'D. Soylu'],
  'Metin Şen': ['Metin Sen', 'Şen', 'Sen', 'M. Şen'],
  'Hasan Bulut': ['Hasan Bulut', 'H. Bulut'],
  'Emre Can Duran': ['Emre Can Duran', 'Duran', 'E. Duran'],
  'Hasan Ayyıldız': ['Hasan Ayyildiz', 'Ayyıldız', 'Ayyildiz', 'H. Ayyıldız'],
  'Burak Kır': ['Burak Kir', 'Kır', 'Kir', 'B. Kır'],
  'Thierry Karadeniz': ['Thierry Karadeniz', 'Karadeniz', 'T. Karadeniz'],
  'Yüksel Küçük': ['Yuksel Kucuk', 'Küçük', 'Kucuk', 'Y. Küçük'],
  'Halil Koç': ['Halil Koc', 'Koç', 'Koc', 'H. Koç'],
  'Eymen Erdoğan': ['Eymen Erdogan', 'Erdoğan', 'Erdogan', 'E. Erdoğan'],
  'Eymen Demir': ['Eymen Demir', 'E. Demir'],
  'Furkan Dursun': ['Furkan Dursun', 'Dursun', 'F. Dursun'],
  // New athletes - March 2026 batch 2 (23 new)
  'Yusuf Yazici': ['Yusuf Yazici', 'Yazici', 'Y. Yazici'],
  'Eren Dinkci': ['Eren Dinkci', 'Dinkci', 'E. Dinkci'],
  'Aral Simsir': ['Aral Simsir', 'Simsir', 'A. Simsir'],
  'Dogucan Haspolat': ['Dogucan Haspolat', 'Haspolat', 'D. Haspolat'],
  'Yunus Konak': ['Yunus Konak', 'Konak', 'Y. Konak', 'Yunus Emre Konak'],
  'Emin Bayram': ['Emin Bayram', 'Bayram', 'E. Bayram'],
  'Cenk Ozkacar': ['Cenk Ozkacar', 'Ozkacar', 'C. Ozkacar'],
  'Enis Destan': ['Enis Destan', 'Destan', 'E. Destan'],
  'Serdar Saatci': ['Serdar Saatci', 'Saatci', 'S. Saatci'],
  'Ravil Tagir': ['Ravil Tagir', 'Tagir', 'R. Tagir'],
  'Eren Yardimci': ['Eren Yardimci', 'Erencan Yardimci', 'Yardimci', 'E. Yardimci'],
  'Deniz Hummel': ['Deniz Hummel', 'Deniz Hummet', 'Hummel', 'Hummet', 'D. Hummel', 'D. Hummet'],
  'Kenan Karaman': ['Kenan Karaman', 'Karaman', 'K. Karaman'],
  'Hasan Kurucay': ['Hasan Kurucay', 'Kurucay', 'H. Kurucay'],
  'Naci Unuvar': ['Naci Unuvar', 'Unuvar', 'N. Unuvar'],
  'Emircan Gurluk': ['Emircan Gurluk', 'Feyttullah Gurluk', 'Gurluk', 'E. Gurluk', 'F. Gurluk'],
  'Mehmet Aydin': ['Mehmet Aydin', 'Aydin', 'M. Aydin'],
  'Furkan Demir': ['Furkan Demir', 'F. Demir'],
  'Emirhan Demircan': ['Emirhan Demircan', 'Demircan', 'E. Demircan'],
  'Kadir Seven': ['Kadir Seven', 'Seven', 'K. Seven'],
  'Halil Ozdemir': ['Halil Ozdemir', 'Ozdemir', 'H. Ozdemir'],
  'Eren Aydin': ['Eren Aydin', 'E. Aydin'],
  'Emre Uzun': ['Emre Uzun', 'Uzun', 'E. Uzun'],
};

interface ApiFootballResponse {
  response: any[];
  errors: any;
  results: number;
}

async function fetchApiFootball(endpoint: string, apiKey: string): Promise<ApiFootballResponse | null> {
  const url = `${API_FOOTBALL_BASE}${endpoint}`;
  console.log(`Fetching: ${endpoint}`);
  
  try {
    const response = await fetch(url, {
      headers: {
        'x-apisports-key': apiKey,
      },
    });

    if (!response.ok) {
      console.error(`API error: ${response.status}`);
      return null;
    }

    const data = await response.json();
    
    if (data.errors && Object.keys(data.errors).length > 0) {
      console.error('API errors:', data.errors);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Fetch error:', error);
    return null;
  }
}

function matchPlayerName(apiName: string, athleteName: string): boolean {
  const apiNameLower = apiName.toLowerCase();
  const variants = PLAYER_NAME_VARIANTS[athleteName] || [athleteName];
  
  for (const variant of variants) {
    if (apiNameLower.includes(variant.toLowerCase()) || variant.toLowerCase().includes(apiNameLower)) {
      return true;
    }
  }
  
  const lastName = athleteName.split(' ').pop()?.toLowerCase();
  if (lastName && apiNameLower.includes(lastName)) {
    return true;
  }
  
  return false;
}

function getSearchVariations(playerName: string): string[] {
  const variations: string[] = [];
  
  variations.push(playerName);
  
  const lastName = playerName.split(' ').pop();
  if (lastName) {
    variations.push(lastName);
  }
  
  const asciiName = playerName
    .replace(/ç/gi, 'c')
    .replace(/ğ/gi, 'g')
    .replace(/ı/gi, 'i')
    .replace(/İ/gi, 'I')
    .replace(/ö/gi, 'o')
    .replace(/ş/gi, 's')
    .replace(/ü/gi, 'u')
    .replace(/Ç/gi, 'C')
    .replace(/Ğ/gi, 'G')
    .replace(/Ö/gi, 'O')
    .replace(/Ş/gi, 'S')
    .replace(/Ü/gi, 'U');
  
  if (asciiName !== playerName) {
    variations.push(asciiName);
    const asciiLastName = asciiName.split(' ').pop();
    if (asciiLastName) {
      variations.push(asciiLastName);
    }
  }
  
  const predefinedVariants = PLAYER_NAME_VARIANTS[playerName];
  if (predefinedVariants) {
    for (const variant of predefinedVariants) {
      if (!variations.includes(variant)) {
        variations.push(variant);
      }
    }
  }
  
  return [...new Set(variations)];
}

async function searchPlayerByName(playerName: string, apiKey: string, expectedTeamId?: number): Promise<number | null> {
  const variations = getSearchVariations(playerName);
  
  for (const searchTerm of variations) {
    console.log(`Searching API for: ${searchTerm}...`);
    const searchData = await fetchApiFootball(`/players?search=${encodeURIComponent(searchTerm)}&season=${CURRENT_SEASON}`, apiKey);
    
    if (searchData?.response && searchData.response.length > 0) {
      for (const result of searchData.response) {
        const foundName = result.player?.name || '';
        if (matchPlayerName(foundName, playerName)) {
          // If expectedTeamId is provided, verify the player is on the correct team
          if (expectedTeamId) {
            const playerTeamId = result.statistics?.[0]?.team?.id;
            if (playerTeamId && playerTeamId !== expectedTeamId) {
              console.log(`Skipping ${foundName} (ID: ${result.player?.id}) - wrong team: ${playerTeamId} vs expected ${expectedTeamId}`);
              continue;
            }
          }
          console.log(`Found via search: ${foundName} (ID: ${result.player?.id})`);
          return result.player?.id;
        }
      }
    }
    
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  
  return null;
}

async function findPlayerInTeam(teamId: number, playerName: string, apiKey: string): Promise<number | null> {
  console.log(`Searching for ${playerName} in team ${teamId}...`);
  
  const squadData = await fetchApiFootball(`/players/squads?team=${teamId}`, apiKey);
  
  if (squadData?.response?.[0]?.players) {
    const squad = squadData.response[0].players;
    
    for (const player of squad) {
      if (matchPlayerName(player.name || '', playerName)) {
        console.log(`Found in squad: ${player.name} (ID: ${player.id})`);
        return player.id;
      }
    }
  }
  
  console.log(`Player not found in squad, trying search API for ${playerName}...`);
  const searchResult = await searchPlayerByName(playerName, apiKey, teamId);
  
  if (searchResult) {
    return searchResult;
  }
  
  return null;
}

async function getPlayerStatsFromFixture(
  fixtureId: number, 
  playerId: number,
  playerName: string,
  apiKey: string
): Promise<any | null> {
  const data = await fetchApiFootball(`/fixtures/players?fixture=${fixtureId}`, apiKey);
  
  if (!data?.response) {
    return null;
  }

  for (const teamData of data.response) {
    const players = teamData.players || [];
    
    for (const playerEntry of players) {
      const player = playerEntry.player;
      const stats = playerEntry.statistics?.[0];
      
      if (player?.id === playerId || matchPlayerName(player?.name || '', playerName)) {
        console.log(`Found player stats for ${player?.name} in fixture ${fixtureId}`);
        
        return {
          minutes_played: stats?.games?.minutes || 0,
          rating: stats?.games?.rating ? parseFloat(stats.games.rating) : null,
          played: (stats?.games?.minutes || 0) > 0,
          stats: {
            goals: stats?.goals?.total || 0,
            assists: stats?.goals?.assists || 0,
            shots_total: stats?.shots?.total || 0,
            shots_on_target: stats?.shots?.on || 0,
            passes_total: stats?.passes?.total || 0,
            passes_accuracy: stats?.passes?.accuracy || 0,
            key_passes: stats?.passes?.key || 0,
            tackles: stats?.tackles?.total || 0,
            interceptions: stats?.tackles?.interceptions || 0,
            dribbles_success: stats?.dribbles?.success || 0,
            dribbles_attempts: stats?.dribbles?.attempts || 0,
            duels_won: stats?.duels?.won || 0,
            fouls_committed: stats?.fouls?.committed || 0,
            fouls_drawn: stats?.fouls?.drawn || 0,
            yellow_cards: stats?.cards?.yellow || 0,
            red_cards: stats?.cards?.red || 0,
            saves: stats?.goals?.saves || 0,
            goals_conceded: stats?.goals?.conceded || 0,
            penalties_saved: stats?.penalty?.saved || 0,
            penalties_missed: stats?.penalty?.missed || 0,
          }
        };
      }
    }
  }
  
  return null;
}

async function fetchTeamFixturesWithStats(
  apiKey: string, 
  teamName: string,
  playerId: number,
  playerName: string,
  type: 'next' | 'last'
): Promise<any[]> {
  const fixtures: any[] = [];
  
  let teamId = TEAM_IDS[teamName];
  if (!teamId) {
    const teamSearch = await fetchApiFootball(`/teams?search=${encodeURIComponent(teamName)}`, apiKey);
    teamId = teamSearch?.response?.[0]?.team?.id;
  }
  
  if (!teamId) {
    console.log(`Could not find team: ${teamName}`);
    return fixtures;
  }

  const fixturesData = await fetchApiFootball(`/fixtures?team=${teamId}&${type}=10`, apiKey);
  
  if (!fixturesData?.response) {
    return fixtures;
  }

  console.log(`Found ${fixturesData.response.length} fixtures for ${teamName} (type: ${type})`);

  for (const fixture of fixturesData.response) {
    const fixtureId = fixture.fixture?.id;
    const isHome = fixture.teams?.home?.id === teamId;
    const opponent = isHome ? fixture.teams?.away?.name : fixture.teams?.home?.name;
    const homeScore = fixture.goals?.home;
    const awayScore = fixture.goals?.away;
    const matchDate = fixture.fixture?.date;
    const status = fixture.fixture?.status?.short;
    
    const fixtureData: any = {
      fixture_id: fixtureId,
      date: matchDate ? new Date(matchDate).toISOString().split('T')[0] : null,
      match_date: matchDate,
      opponent: opponent || 'Unknown',
      competition: fixture.league?.name || 'Unknown',
      home_away: isHome ? 'home' : 'away',
      match_result: homeScore !== null && awayScore !== null ? `${homeScore}-${awayScore}` : null,
      status: status,
    };
    
    if (type === 'last' && status === 'FT' && fixtureId) {
      console.log(`Fetching player stats for fixture ${fixtureId}...`);
      const playerStats = await getPlayerStatsFromFixture(fixtureId, playerId, playerName, apiKey);
      
      if (playerStats) {
        fixtureData.minutes_played = playerStats.minutes_played;
        fixtureData.rating = playerStats.rating;
        fixtureData.played = playerStats.played;
        fixtureData.stats = playerStats.stats;
      } else {
        fixtureData.minutes_played = 0;
        fixtureData.rating = null;
        fixtureData.played = false;
        fixtureData.stats = {};
      }
      
      // Rate limit - important with more fixtures!
      await new Promise(resolve => setTimeout(resolve, 300));
    }
    
    fixtures.push(fixtureData);
  }
  
  return fixtures;
}

function parseSeasonStats(data: ApiFootballResponse): any[] {
  const seasonStats: any[] = [];
  
  const playerResponse = data.response?.[0];
  if (!playerResponse) return seasonStats;

  const statistics = playerResponse.statistics || [];
  
  for (const stat of statistics) {
    const league = stat.league;
    const games = stat.games;
    const goals = stat.goals;
    const passes = stat.passes;
    const tackles = stat.tackles;
    const cards = stat.cards;
    const penalty = stat.penalty;

    seasonStats.push({
      season: `${league?.season || CURRENT_SEASON}/${(league?.season || CURRENT_SEASON) + 1}`.slice(-7),
      competition: league?.name || 'Unknown',
      games_played: games?.appearences || 0,
      games_started: games?.lineups || 0,
      stats: {
        goals: goals?.total || 0,
        assists: goals?.assists || 0,
        minutes: games?.minutes || 0,
        yellow_cards: cards?.yellow || 0,
        red_cards: cards?.red || 0,
        rating: games?.rating ? parseFloat(games.rating) : null,
        shots_total: stat.shots?.total || 0,
        shots_on_target: stat.shots?.on || 0,
        passes_total: passes?.total || 0,
        passes_accuracy: passes?.accuracy || 0,
        key_passes: passes?.key || 0,
        tackles: tackles?.total || 0,
        interceptions: tackles?.interceptions || 0,
        saves: goals?.saves || 0,
        goals_conceded: goals?.conceded || 0,
        clean_sheets: games?.lineups ? (games.lineups - (goals?.conceded > 0 ? Math.min(goals.conceded, games.lineups) : 0)) : 0,
        penalties_saved: penalty?.saved || 0,
        penalties_missed: penalty?.missed || 0,
      },
    });
  }
  
  return seasonStats;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const START_TIME = Date.now();
  // Time budgets (milliseconds) - stay well under Supabase's ~150s limit
  const STATS_BUDGET_MS = 80_000;    // 80s for full stats (phase 1)
  // Discovery phase removed in v22 -- only tracked athletes with API IDs are processed
  const HARD_STOP_MS = 140_000;       // absolute stop at 140s, write logs and bail

  function elapsed(): number { return Date.now() - START_TIME; }

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

    // Check cooldown (10 minutes for football stats)
    const cooldownResult = await checkCooldown('football_stats', 600);
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

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const apiFootballKey = Deno.env.get('API_FOOTBALL_KEY');

    if (!apiFootballKey) {
      throw new Error('API_FOOTBALL_KEY not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log(`Starting football stats fetch (season: ${CURRENT_SEASON}, v22)`);

    // Fetch only tracked football athletes with API IDs
    const { data: trackedAthletes, error: athletesError } = await supabase
      .from('athlete_profiles')
      .select('id, slug, api_football_id, name, team')
      .eq('sport', 'football')
      .eq('track_stats', true)
      .not('api_football_id', 'is', null);

    if (athletesError) {
      throw new Error(`Error fetching athletes: ${athletesError.message}`);
    }

    const withId = trackedAthletes || [];

    console.log(`Total: ${withId.length} tracked athletes with API IDs`);

    const results: any[] = [];

    // ============ PHASE 1: Full stats for athletes WITH api_football_id ============
    console.log('--- PHASE 1: Full stats ---');
    for (const athlete of withId) {
      if (elapsed() > STATS_BUDGET_MS) {
        console.log(`Stats budget exhausted at ${Math.round(elapsed()/1000)}s, processed ${results.length} athletes`);
        break;
      }

      try {
        const playerId = athlete.api_football_id;
        console.log(`Processing ${athlete.name} (ID: ${playerId})...`);

        const playerData = await fetchApiFootball(
          `/players?id=${playerId}&season=${CURRENT_SEASON}`,
          apiFootballKey
        );

        const seasonStats = playerData ? parseSeasonStats(playerData) : [];

        const recentMatches = await fetchTeamFixturesWithStats(
          apiFootballKey,
          athlete.team,
          playerId,
          athlete.name,
          'last'
        );

        let matchesWithStats = 0;
        for (const match of recentMatches) {
          if (match.date && match.status === 'FT') {
            const { error: updateError } = await supabase
              .from('athlete_daily_updates')
              .upsert({
                athlete_id: athlete.id,
                date: match.date,
                opponent: match.opponent,
                competition: match.competition,
                home_away: match.home_away,
                match_result: match.match_result,
                played: match.played ?? false,
                minutes_played: match.minutes_played ?? 0,
                rating: match.rating,
                stats: match.stats || {},
              }, {
                onConflict: 'athlete_id,date',
                ignoreDuplicates: false,
              });

            if (!updateError && match.played) {
              matchesWithStats++;
            }
          }
        }

        for (const stats of seasonStats) {
          await supabase
            .from('athlete_season_stats')
            .upsert({
              athlete_id: athlete.id,
              season: stats.season,
              competition: stats.competition,
              games_played: stats.games_played,
              games_started: stats.games_started,
              stats: stats.stats,
            }, {
              onConflict: 'athlete_id,season,competition',
              ignoreDuplicates: false,
            });
        }

        // Only fetch upcoming if we still have time
        if (elapsed() < STATS_BUDGET_MS - 5000) {
          const upcomingMatches = await fetchTeamFixturesWithStats(
            apiFootballKey,
            athlete.team,
            playerId,
            athlete.name,
            'next'
          );

          await supabase
            .from('athlete_upcoming_matches')
            .delete()
            .eq('athlete_id', athlete.id);

          for (const match of upcomingMatches.slice(0, 5)) {
            if (match.match_date) {
              await supabase
                .from('athlete_upcoming_matches')
                .insert({
                  athlete_id: athlete.id,
                  match_date: match.match_date,
                  opponent: match.opponent,
                  competition: match.competition,
                  home_away: match.home_away,
                });
            }
          }

          results.push({
            athlete: athlete.name,
            api_football_id: playerId,
            status: 'success',
            matches_with_stats: matchesWithStats,
            total_matches: recentMatches.filter(m => m.status === 'FT').length,
            upcoming_matches: upcomingMatches.length,
            season_stats: seasonStats.length,
          });
        } else {
          results.push({
            athlete: athlete.name,
            api_football_id: playerId,
            status: 'success_partial',
            matches_with_stats: matchesWithStats,
            total_matches: recentMatches.filter(m => m.status === 'FT').length,
            season_stats: seasonStats.length,
          });
        }

        await new Promise(resolve => setTimeout(resolve, 300));

      } catch (playerError: any) {
        console.error(`Error processing ${athlete.name}:`, playerError);
        results.push({ athlete: athlete.name, status: 'error', error: playerError?.message });
      }
    }

    // Phase 2 (discovery) removed in v22 -- track_stats controls which athletes get processed

    // Log the sync
    const statsProcessed = results.filter(r => r.status === 'success' || r.status === 'success_partial').length;

    await supabase.from('sync_logs').insert({
      sync_type: 'football_stats',
      status: 'success',
      details: {
        tracked_athletes: withId.length,
        stats_processed: statsProcessed,
        errors: results.filter(r => r.status === 'error').length,
        auth_method: authResult.reason,
        version: 'v22',
        season: CURRENT_SEASON,
        elapsed_seconds: Math.round(elapsed() / 1000),
      },
    });

    console.log(`Football stats fetch completed in ${Math.round(elapsed()/1000)}s`);

    return new Response(JSON.stringify({
      success: true,
      timestamp: new Date().toISOString(),
      api: 'API-Football',
      elapsed_seconds: Math.round(elapsed() / 1000),
      summary: {
        tracked_athletes: withId.length,
        stats_processed: statsProcessed,
      },
      results,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error?.message,
      elapsed_seconds: Math.round(elapsed() / 1000),
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

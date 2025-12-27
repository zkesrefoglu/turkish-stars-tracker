// ============================================================================
// TST PHASE II: FBREF TYPES
// ============================================================================

// ============================================================================
// PLAYER EXTERNAL IDS
// ============================================================================

export interface PlayerExternalIds {
  fbref_id: string;
  fbref_url: string;
  transfermarkt_id?: number;
  transfermarkt_slug?: string;
  fotmob_id?: number;
  sofascore_id?: number;
  whoscored_id?: number;
}

// ============================================================================
// ADVANCED STATS (from athlete_advanced_stats table)
// ============================================================================

export interface AthleteAdvancedStats {
  id: string;
  athlete_id: string;
  season: string;
  competition: string;
  
  // Standard
  matches_played: number;
  starts: number;
  minutes: number;
  goals: number;
  assists: number;
  goals_assists: number;
  non_penalty_goals: number;
  penalty_goals: number;
  penalty_attempted: number;
  yellow_cards: number;
  red_cards: number;
  
  // Per 90
  goals_per90: number;
  assists_per90: number;
  goals_assists_per90: number;
  
  // Shooting (xG)
  xg: number;
  npxg: number;
  xg_per90: number;
  shots_total: number;
  shots_on_target: number;
  shots_on_target_pct: number;
  shots_per90: number;
  shots_on_target_per90: number;
  goals_per_shot: number;
  goals_per_shot_on_target: number;
  avg_shot_distance: number;
  free_kick_shots: number;
  
  // Passing
  passes_completed: number;
  passes_attempted: number;
  pass_completion_pct: number;
  total_pass_distance: number;
  progressive_pass_distance: number;
  short_passes_completed: number;
  short_passes_attempted: number;
  medium_passes_completed: number;
  medium_passes_attempted: number;
  long_passes_completed: number;
  long_passes_attempted: number;
  
  // Advanced Passing
  xa: number;
  xa_per90: number;
  key_passes: number;
  passes_into_final_third: number;
  passes_into_penalty_area: number;
  crosses_into_penalty_area: number;
  progressive_passes: number;
  through_balls: number;
  
  // Shot Creation
  shot_creating_actions: number;
  sca_per90: number;
  goal_creating_actions: number;
  gca_per90: number;
  
  // Possession
  touches: number;
  touches_def_pen: number;
  touches_def_third: number;
  touches_mid_third: number;
  touches_att_third: number;
  touches_att_pen: number;
  live_ball_touches: number;
  
  // Carries
  carries: number;
  total_carry_distance: number;
  progressive_carry_distance: number;
  progressive_carries: number;
  carries_into_final_third: number;
  carries_into_penalty_area: number;
  miscontrols: number;
  dispossessed: number;
  
  // Take-Ons
  take_ons_attempted: number;
  take_ons_successful: number;
  take_ons_success_pct: number;
  take_ons_tackled: number;
  
  // Defense
  tackles: number;
  tackles_won: number;
  tackles_def_third: number;
  tackles_mid_third: number;
  tackles_att_third: number;
  challenges: number;
  challenges_won: number;
  challenges_lost: number;
  challenges_won_pct: number;
  blocks: number;
  shots_blocked: number;
  passes_blocked: number;
  interceptions: number;
  tackles_plus_interceptions: number;
  clearances: number;
  errors_leading_to_shot: number;
  
  // Pressures
  pressures: number;
  pressure_successes: number;
  pressure_success_pct: number;
  pressures_def_third: number;
  pressures_mid_third: number;
  pressures_att_third: number;
  
  // Misc
  aerials_won: number;
  aerials_lost: number;
  aerials_won_pct: number;
  fouls_committed: number;
  fouls_drawn: number;
  offsides: number;
  ball_recoveries: number;
  
  // Goalkeeper Specific
  saves?: number;
  save_pct?: number;
  goals_against?: number;
  goals_against_per90?: number;
  clean_sheets?: number;
  clean_sheet_pct?: number;
  psxg?: number;
  psxg_minus_ga?: number;
  
  // Meta
  fbref_url?: string;
  last_updated: string;
  created_at: string;
}

// ============================================================================
// PERCENTILE RANKINGS (for radar charts)
// ============================================================================

export interface AthletePercentileRankings {
  id: string;
  athlete_id: string;
  
  // Attacking
  goals_per90_pct: number;
  npxg_per90_pct: number;
  shots_per90_pct: number;
  shots_on_target_per90_pct: number;
  
  // Passing
  xa_per90_pct: number;
  key_passes_per90_pct: number;
  pass_completion_pct: number;
  progressive_passes_per90_pct: number;
  through_balls_per90_pct: number;
  
  // Possession
  touches_per90_pct: number;
  progressive_carries_per90_pct: number;
  take_ons_success_pct: number;
  carries_into_final_third_per90_pct: number;
  
  // Creation
  sca_per90_pct: number;
  gca_per90_pct: number;
  
  // Defense
  tackles_per90_pct: number;
  interceptions_per90_pct: number;
  blocks_per90_pct: number;
  clearances_per90_pct: number;
  pressures_per90_pct: number;
  pressure_success_pct_pct: number;
  aerials_won_pct_pct: number;
  
  // Goalkeeper
  save_pct_pct?: number;
  psxg_minus_ga_per90_pct?: number;
  clean_sheet_pct_pct?: number;
  
  // Meta
  comparison_group: string;
  minutes_played: number;
  period: string;
  source_url?: string;
  last_updated: string;
}

// ============================================================================
// FBREF PLAYER CONFIG (for scraping)
// ============================================================================

export interface FBrefPlayerConfig {
  name: string;
  slug: string;
  fbref_id: string;
  team: string;
  league: string;
  position: 'GK' | 'CB' | 'FB' | 'DM' | 'CM' | 'AM' | 'LW' | 'RW' | 'ST';
  transfermarkt_id?: number;
  fotmob_id?: number;
}

// ============================================================================
// COMPLETE PLAYER IDS MAPPING
// ============================================================================

export const TURKISH_STARS_FBREF_IDS: Record<string, FBrefPlayerConfig> = {
  'arda-guler': {
    name: 'Arda Güler',
    slug: 'arda-guler',
    fbref_id: '3741ca58',
    team: 'Real Madrid',
    league: 'La Liga',
    position: 'AM',
    transfermarkt_id: 861410,
    fotmob_id: 1316257
  },
  'kenan-yildiz': {
    name: 'Kenan Yıldız',
    slug: 'kenan-yildiz',
    fbref_id: 'd8cda243',
    team: 'Juventus',
    league: 'Serie A',
    position: 'LW',
    transfermarkt_id: 798650,
    fotmob_id: 1183977
  },
  'hakan-calhanoglu': {
    name: 'Hakan Çalhanoğlu',
    slug: 'hakan-calhanoglu',
    fbref_id: 'cd0fa27b',
    team: 'Inter',
    league: 'Serie A',
    position: 'DM',
    transfermarkt_id: 126414,
    fotmob_id: 275008
  },
  'ferdi-kadioglu': {
    name: 'Ferdi Kadıoğlu',
    slug: 'ferdi-kadioglu',
    fbref_id: '66c52a77',
    team: 'Brighton',
    league: 'Premier League',
    position: 'FB',
    transfermarkt_id: 346498,
    fotmob_id: 869509
  },
  'can-uzun': {
    name: 'Can Uzun',
    slug: 'can-uzun',
    fbref_id: '1d0b134a',
    team: 'Eintracht Frankfurt',
    league: 'Bundesliga',
    position: 'AM',
    transfermarkt_id: 886655,
    fotmob_id: 1241857
  },
  'berke-ozer': {
    name: 'Berke Özer',
    slug: 'berke-ozer',
    fbref_id: '0743d0ec',
    team: 'Lille',
    league: 'Ligue 1',
    position: 'GK',
    transfermarkt_id: 481886,
    fotmob_id: 1002847
  },
  'altay-bayindir': {
    name: 'Altay Bayındır',
    slug: 'altay-bayindir',
    fbref_id: '072e68ed',
    team: 'Manchester United',
    league: 'Premier League',
    position: 'GK',
    transfermarkt_id: 410519,
    fotmob_id: 802498
  },
  'enes-unal': {
    name: 'Enes Ünal',
    slug: 'enes-unal',
    fbref_id: '8a559e2a',
    team: 'Bournemouth',
    league: 'Premier League',
    position: 'ST',
    transfermarkt_id: 282181,
    fotmob_id: 574609
  },
  'merih-demiral': {
    name: 'Merih Demiral',
    slug: 'merih-demiral',
    fbref_id: 'b6260402',
    team: 'Al-Ahli',
    league: 'Saudi Pro League',
    position: 'CB',
    transfermarkt_id: 262498,
    fotmob_id: 619618
  },
  'orkun-kokcu': {
    name: 'Orkun Kökçü',
    slug: 'orkun-kokcu',
    fbref_id: '68f7de41',
    team: 'Benfica',
    league: 'Primeira Liga',
    position: 'CM',
    transfermarkt_id: 435208,
    fotmob_id: 848572
  },
  'kerem-akturkoglu': {
    name: 'Kerem Aktürkoğlu',
    slug: 'kerem-akturkoglu',
    fbref_id: '51b22e7a',
    team: 'Benfica',
    league: 'Primeira Liga',
    position: 'LW',
    transfermarkt_id: 612240,
    fotmob_id: 1039891
  },
  'semih-kilicsoy': {
    name: 'Semih Kılıçsoy',
    slug: 'semih-kilicsoy',
    fbref_id: '12b6abf6',
    team: 'Beşiktaş',
    league: 'Süper Lig',
    position: 'ST',
    transfermarkt_id: 954498,
    fotmob_id: 1421673
  },
  'yusuf-akcicek': {
    name: 'Yusuf Akçiçek',
    slug: 'yusuf-akcicek',
    fbref_id: '4c7f9a82',
    team: 'Bayern Munich',
    league: 'Bundesliga',
    position: 'CB',
    transfermarkt_id: 676158,
    fotmob_id: 1103482
  },
  'atakan-karazor': {
    name: 'Atakan Karazor',
    slug: 'atakan-karazor',
    fbref_id: 'e6a8a1a0',
    team: 'Stuttgart',
    league: 'Bundesliga',
    position: 'DM',
    transfermarkt_id: 268742,
    fotmob_id: 605911
  },
  'baris-alper-yilmaz': {
    name: 'Barış Alper Yılmaz',
    slug: 'baris-alper-yilmaz',
    fbref_id: '3e2bb7f0',
    team: 'Galatasaray',
    league: 'Süper Lig',
    position: 'RW',
    transfermarkt_id: 596814,
    fotmob_id: 1155108
  },
  'yunus-akgun': {
    name: 'Yunus Akgün',
    slug: 'yunus-akgun',
    fbref_id: 'a15e4b2c',
    team: 'Galatasaray',
    league: 'Süper Lig',
    position: 'LW',
    transfermarkt_id: 469448,
    fotmob_id: 909712
  },
  'deniz-gul': {
    name: 'Deniz Gül',
    slug: 'deniz-gul',
    fbref_id: '6f59f35b',
    team: 'Galatasaray',
    league: 'Süper Lig',
    position: 'ST',
    transfermarkt_id: 800589,
    fotmob_id: 1205988
  }
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

export function getFBrefUrl(fbrefId: string, playerName: string): string {
  const slug = playerName.replace(/\s+/g, '-').replace(/[ıİ]/g, 'i').replace(/[üÜ]/g, 'u')
    .replace(/[öÖ]/g, 'o').replace(/[çÇ]/g, 'c').replace(/[ğĞ]/g, 'g').replace(/[şŞ]/g, 's');
  return `https://fbref.com/en/players/${fbrefId}/${slug}`;
}

export function getPercentileLabel(value: number): string {
  if (value >= 90) return 'Elite';
  if (value >= 75) return 'Excellent';
  if (value >= 60) return 'Good';
  if (value >= 40) return 'Average';
  if (value >= 25) return 'Below Avg';
  return 'Poor';
}

export function getPercentileColor(value: number): string {
  if (value >= 90) return 'text-emerald-500';
  if (value >= 75) return 'text-green-500';
  if (value >= 60) return 'text-blue-500';
  if (value >= 40) return 'text-foreground';
  if (value >= 25) return 'text-amber-500';
  return 'text-red-500';
}

export function calculatePer90(value: number, minutes: number): number {
  if (minutes <= 0) return 0;
  return Number(((value / minutes) * 90).toFixed(2));
}

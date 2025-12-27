-- ============================================================================
-- TST PHASE II: FBREF INTEGRATION - SQL MIGRATIONS
-- ============================================================================

-- PART 1: ADD FBREF COLUMNS TO EXISTING athlete_profiles TABLE
ALTER TABLE athlete_profiles ADD COLUMN IF NOT EXISTS fbref_id TEXT;
ALTER TABLE athlete_profiles ADD COLUMN IF NOT EXISTS fbref_url TEXT;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_fbref_id ON athlete_profiles(fbref_id);

-- ============================================================================
-- PART 2: CREATE athlete_advanced_stats TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS athlete_advanced_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id UUID REFERENCES athlete_profiles(id) ON DELETE CASCADE,
  season TEXT NOT NULL,
  competition TEXT NOT NULL,
  
  -- STANDARD STATS
  matches_played INTEGER DEFAULT 0,
  starts INTEGER DEFAULT 0,
  minutes INTEGER DEFAULT 0,
  goals INTEGER DEFAULT 0,
  assists INTEGER DEFAULT 0,
  goals_assists INTEGER GENERATED ALWAYS AS (goals + assists) STORED,
  non_penalty_goals INTEGER DEFAULT 0,
  penalty_goals INTEGER DEFAULT 0,
  penalty_attempted INTEGER DEFAULT 0,
  yellow_cards INTEGER DEFAULT 0,
  red_cards INTEGER DEFAULT 0,
  
  -- PER 90 STATS
  goals_per90 DECIMAL(4,2) DEFAULT 0,
  assists_per90 DECIMAL(4,2) DEFAULT 0,
  goals_assists_per90 DECIMAL(4,2) DEFAULT 0,
  
  -- SHOOTING (xG)
  xg DECIMAL(5,2) DEFAULT 0,
  npxg DECIMAL(5,2) DEFAULT 0,
  xg_per90 DECIMAL(4,2) DEFAULT 0,
  shots_total INTEGER DEFAULT 0,
  shots_on_target INTEGER DEFAULT 0,
  shots_on_target_pct DECIMAL(4,1) DEFAULT 0,
  shots_per90 DECIMAL(4,2) DEFAULT 0,
  shots_on_target_per90 DECIMAL(4,2) DEFAULT 0,
  goals_per_shot DECIMAL(4,3) DEFAULT 0,
  goals_per_shot_on_target DECIMAL(4,3) DEFAULT 0,
  avg_shot_distance DECIMAL(4,1) DEFAULT 0,
  free_kick_shots INTEGER DEFAULT 0,
  
  -- PASSING
  passes_completed INTEGER DEFAULT 0,
  passes_attempted INTEGER DEFAULT 0,
  pass_completion_pct DECIMAL(4,1) DEFAULT 0,
  total_pass_distance INTEGER DEFAULT 0,
  progressive_pass_distance INTEGER DEFAULT 0,
  short_passes_completed INTEGER DEFAULT 0,
  short_passes_attempted INTEGER DEFAULT 0,
  medium_passes_completed INTEGER DEFAULT 0,
  medium_passes_attempted INTEGER DEFAULT 0,
  long_passes_completed INTEGER DEFAULT 0,
  long_passes_attempted INTEGER DEFAULT 0,
  
  -- ADVANCED PASSING
  xa DECIMAL(5,2) DEFAULT 0,
  xa_per90 DECIMAL(4,2) DEFAULT 0,
  key_passes INTEGER DEFAULT 0,
  passes_into_final_third INTEGER DEFAULT 0,
  passes_into_penalty_area INTEGER DEFAULT 0,
  crosses_into_penalty_area INTEGER DEFAULT 0,
  progressive_passes INTEGER DEFAULT 0,
  through_balls INTEGER DEFAULT 0,
  
  -- SHOT CREATION
  shot_creating_actions INTEGER DEFAULT 0,
  sca_per90 DECIMAL(4,2) DEFAULT 0,
  goal_creating_actions INTEGER DEFAULT 0,
  gca_per90 DECIMAL(4,2) DEFAULT 0,
  
  -- POSSESSION
  touches INTEGER DEFAULT 0,
  touches_def_pen INTEGER DEFAULT 0,
  touches_def_third INTEGER DEFAULT 0,
  touches_mid_third INTEGER DEFAULT 0,
  touches_att_third INTEGER DEFAULT 0,
  touches_att_pen INTEGER DEFAULT 0,
  live_ball_touches INTEGER DEFAULT 0,
  
  -- CARRIES/DRIBBLES
  carries INTEGER DEFAULT 0,
  total_carry_distance INTEGER DEFAULT 0,
  progressive_carry_distance INTEGER DEFAULT 0,
  progressive_carries INTEGER DEFAULT 0,
  carries_into_final_third INTEGER DEFAULT 0,
  carries_into_penalty_area INTEGER DEFAULT 0,
  miscontrols INTEGER DEFAULT 0,
  dispossessed INTEGER DEFAULT 0,
  
  -- TAKE-ONS (DRIBBLES)
  take_ons_attempted INTEGER DEFAULT 0,
  take_ons_successful INTEGER DEFAULT 0,
  take_ons_success_pct DECIMAL(4,1) DEFAULT 0,
  take_ons_tackled INTEGER DEFAULT 0,
  
  -- DEFENSE
  tackles INTEGER DEFAULT 0,
  tackles_won INTEGER DEFAULT 0,
  tackles_def_third INTEGER DEFAULT 0,
  tackles_mid_third INTEGER DEFAULT 0,
  tackles_att_third INTEGER DEFAULT 0,
  
  -- CHALLENGES
  challenges INTEGER DEFAULT 0,
  challenges_won INTEGER DEFAULT 0,
  challenges_lost INTEGER DEFAULT 0,
  challenges_won_pct DECIMAL(4,1) DEFAULT 0,
  
  -- BLOCKS
  blocks INTEGER DEFAULT 0,
  shots_blocked INTEGER DEFAULT 0,
  passes_blocked INTEGER DEFAULT 0,
  
  -- INTERCEPTIONS & CLEARANCES
  interceptions INTEGER DEFAULT 0,
  tackles_plus_interceptions INTEGER DEFAULT 0,
  clearances INTEGER DEFAULT 0,
  errors_leading_to_shot INTEGER DEFAULT 0,
  
  -- PRESSURES
  pressures INTEGER DEFAULT 0,
  pressure_successes INTEGER DEFAULT 0,
  pressure_success_pct DECIMAL(4,1) DEFAULT 0,
  pressures_def_third INTEGER DEFAULT 0,
  pressures_mid_third INTEGER DEFAULT 0,
  pressures_att_third INTEGER DEFAULT 0,
  
  -- MISCELLANEOUS
  aerials_won INTEGER DEFAULT 0,
  aerials_lost INTEGER DEFAULT 0,
  aerials_won_pct DECIMAL(4,1) DEFAULT 0,
  fouls_committed INTEGER DEFAULT 0,
  fouls_drawn INTEGER DEFAULT 0,
  offsides INTEGER DEFAULT 0,
  ball_recoveries INTEGER DEFAULT 0,
  
  -- GOALKEEPER SPECIFIC
  saves INTEGER DEFAULT 0,
  save_pct DECIMAL(4,1) DEFAULT 0,
  goals_against INTEGER DEFAULT 0,
  goals_against_per90 DECIMAL(4,2) DEFAULT 0,
  clean_sheets INTEGER DEFAULT 0,
  clean_sheet_pct DECIMAL(4,1) DEFAULT 0,
  psxg DECIMAL(5,2) DEFAULT 0,
  psxg_minus_ga DECIMAL(5,2) DEFAULT 0,
  
  -- META
  fbref_url TEXT,
  last_updated TIMESTAMP DEFAULT now(),
  created_at TIMESTAMP DEFAULT now(),
  
  UNIQUE(athlete_id, season, competition)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_advanced_stats_athlete ON athlete_advanced_stats(athlete_id);
CREATE INDEX IF NOT EXISTS idx_advanced_stats_season ON athlete_advanced_stats(season);
CREATE INDEX IF NOT EXISTS idx_advanced_stats_competition ON athlete_advanced_stats(competition);

-- ============================================================================
-- PART 3: CREATE athlete_percentile_rankings TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS athlete_percentile_rankings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id UUID REFERENCES athlete_profiles(id) ON DELETE CASCADE,
  
  -- ATTACKING PERCENTILES (0-99)
  goals_per90_pct INTEGER DEFAULT 0,
  npxg_per90_pct INTEGER DEFAULT 0,
  shots_per90_pct INTEGER DEFAULT 0,
  shots_on_target_per90_pct INTEGER DEFAULT 0,
  
  -- PASSING PERCENTILES
  xa_per90_pct INTEGER DEFAULT 0,
  key_passes_per90_pct INTEGER DEFAULT 0,
  pass_completion_pct INTEGER DEFAULT 0,
  progressive_passes_per90_pct INTEGER DEFAULT 0,
  through_balls_per90_pct INTEGER DEFAULT 0,
  
  -- POSSESSION PERCENTILES
  touches_per90_pct INTEGER DEFAULT 0,
  progressive_carries_per90_pct INTEGER DEFAULT 0,
  take_ons_success_pct INTEGER DEFAULT 0,
  carries_into_final_third_per90_pct INTEGER DEFAULT 0,
  
  -- CREATION PERCENTILES
  sca_per90_pct INTEGER DEFAULT 0,
  gca_per90_pct INTEGER DEFAULT 0,
  
  -- DEFENSE PERCENTILES
  tackles_per90_pct INTEGER DEFAULT 0,
  interceptions_per90_pct INTEGER DEFAULT 0,
  blocks_per90_pct INTEGER DEFAULT 0,
  clearances_per90_pct INTEGER DEFAULT 0,
  pressures_per90_pct INTEGER DEFAULT 0,
  pressure_success_pct_pct INTEGER DEFAULT 0,
  aerials_won_pct_pct INTEGER DEFAULT 0,
  
  -- GOALKEEPER PERCENTILES
  save_pct_pct INTEGER DEFAULT 0,
  psxg_minus_ga_per90_pct INTEGER DEFAULT 0,
  clean_sheet_pct_pct INTEGER DEFAULT 0,
  
  -- META
  comparison_group TEXT,
  minutes_played INTEGER,
  period TEXT DEFAULT 'Last 365 days',
  source_url TEXT,
  last_updated TIMESTAMP DEFAULT now(),
  
  UNIQUE(athlete_id, period)
);

CREATE INDEX IF NOT EXISTS idx_percentile_athlete ON athlete_percentile_rankings(athlete_id);

-- ============================================================================
-- PART 4: RLS POLICIES
-- ============================================================================

-- Enable RLS
ALTER TABLE athlete_advanced_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE athlete_percentile_rankings ENABLE ROW LEVEL SECURITY;

-- Public read access
CREATE POLICY "Public can view advanced stats" ON athlete_advanced_stats
  FOR SELECT USING (true);

CREATE POLICY "Public can view percentile rankings" ON athlete_percentile_rankings
  FOR SELECT USING (true);

-- Admin access for management
CREATE POLICY "Admins can insert advanced stats" ON athlete_advanced_stats
  FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update advanced stats" ON athlete_advanced_stats
  FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete advanced stats" ON athlete_advanced_stats
  FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert percentile rankings" ON athlete_percentile_rankings
  FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update percentile rankings" ON athlete_percentile_rankings
  FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete percentile rankings" ON athlete_percentile_rankings
  FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));
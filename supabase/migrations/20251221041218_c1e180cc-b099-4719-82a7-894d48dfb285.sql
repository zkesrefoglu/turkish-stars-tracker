-- Add espn_id column to athlete_profiles for ESPN player page lookups
ALTER TABLE public.athlete_profiles 
ADD COLUMN IF NOT EXISTS espn_id integer;

-- Add espn_splits JSONB column to athlete_season_stats for storing ESPN-specific data
ALTER TABLE public.athlete_season_stats 
ADD COLUMN IF NOT EXISTS espn_splits jsonb DEFAULT '{}'::jsonb;

-- Add espn_fantasy_insight column for fantasy spin text
ALTER TABLE public.athlete_season_stats 
ADD COLUMN IF NOT EXISTS espn_fantasy_insight text;

-- Add espn_position_rank and espn_roster_pct for fantasy rankings
ALTER TABLE public.athlete_season_stats 
ADD COLUMN IF NOT EXISTS espn_position_rank integer;

ALTER TABLE public.athlete_season_stats 
ADD COLUMN IF NOT EXISTS espn_roster_pct numeric;

-- Update Alperen's ESPN ID (4871144)
UPDATE public.athlete_profiles 
SET espn_id = 4871144 
WHERE slug = 'alperen-sengun';

-- Add index for ESPN ID lookups
CREATE INDEX IF NOT EXISTS idx_athlete_profiles_espn_id ON public.athlete_profiles(espn_id);
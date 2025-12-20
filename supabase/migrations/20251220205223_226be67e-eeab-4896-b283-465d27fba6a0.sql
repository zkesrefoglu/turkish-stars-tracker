-- Add unique constraint on athlete_id for upsert to work
ALTER TABLE public.athlete_live_matches 
ADD CONSTRAINT athlete_live_matches_athlete_id_key UNIQUE (athlete_id);
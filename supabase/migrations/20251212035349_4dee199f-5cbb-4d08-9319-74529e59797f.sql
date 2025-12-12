-- Add unique constraint for injury history upserts
ALTER TABLE public.athlete_injury_history 
ADD CONSTRAINT athlete_injury_history_athlete_start_type_unique 
UNIQUE (athlete_id, start_date, injury_type);

-- Add unique constraint for transfer history upserts
ALTER TABLE public.athlete_transfer_history 
ADD CONSTRAINT athlete_transfer_history_athlete_date_clubs_unique 
UNIQUE (athlete_id, transfer_date, from_club, to_club);

-- Add unique constraint for market values upserts
ALTER TABLE public.athlete_market_values 
ADD CONSTRAINT athlete_market_values_athlete_date_unique 
UNIQUE (athlete_id, recorded_date);
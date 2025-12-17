-- Add unique constraints for Transfermarkt scraper upserts

-- 1. Add unique constraint to athlete_transfer_history
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'unique_transfer'
  ) THEN
    ALTER TABLE athlete_transfer_history 
    ADD CONSTRAINT unique_transfer 
    UNIQUE (athlete_id, transfer_date, from_club, to_club);
  END IF;
END $$;

-- 2. Add unique constraint to athlete_injury_history
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'unique_injury'
  ) THEN
    ALTER TABLE athlete_injury_history 
    ADD CONSTRAINT unique_injury 
    UNIQUE (athlete_id, injury_type, start_date);
  END IF;
END $$;

-- 3. Add unique constraint to athlete_market_values (using recorded_date, which is the actual column name)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'unique_market_value'
  ) THEN
    ALTER TABLE athlete_market_values 
    ADD CONSTRAINT unique_market_value 
    UNIQUE (athlete_id, recorded_date);
  END IF;
END $$;

-- 4. Add season column to transfer_history if missing
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'athlete_transfer_history' AND column_name = 'season'
  ) THEN
    ALTER TABLE athlete_transfer_history ADD COLUMN season TEXT;
  END IF;
END $$;

-- 5. Add club_at_time column to market_values if missing
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'athlete_market_values' AND column_name = 'club_at_time'
  ) THEN
    ALTER TABLE athlete_market_values ADD COLUMN club_at_time TEXT;
  END IF;
END $$;
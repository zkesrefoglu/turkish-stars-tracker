
-- Phase 2A: Database Foundation for Turkish Stars Tracker

-- =====================================================
-- 1. ADD NEW COLUMNS TO athlete_profiles
-- =====================================================
ALTER TABLE public.athlete_profiles
ADD COLUMN IF NOT EXISTS transfermarkt_id INTEGER,
ADD COLUMN IF NOT EXISTS transfermarkt_slug TEXT,
ADD COLUMN IF NOT EXISTS current_market_value DECIMAL(15, 2),
ADD COLUMN IF NOT EXISTS market_value_currency TEXT DEFAULT 'EUR',
ADD COLUMN IF NOT EXISTS contract_until DATE,
ADD COLUMN IF NOT EXISTS date_of_birth DATE,
ADD COLUMN IF NOT EXISTS nationality TEXT DEFAULT 'Turkey',
ADD COLUMN IF NOT EXISTS height_cm INTEGER,
ADD COLUMN IF NOT EXISTS preferred_foot TEXT;

-- =====================================================
-- 2. CREATE athlete_transfer_history TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.athlete_transfer_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  athlete_id UUID NOT NULL REFERENCES public.athlete_profiles(id) ON DELETE CASCADE,
  transfer_date DATE NOT NULL,
  from_club TEXT NOT NULL,
  from_club_logo_url TEXT,
  to_club TEXT NOT NULL,
  to_club_logo_url TEXT,
  transfer_fee DECIMAL(15, 2),
  fee_currency TEXT DEFAULT 'EUR',
  transfer_type TEXT DEFAULT 'transfer', -- transfer, loan, loan_return, free, youth_promotion
  market_value_at_transfer DECIMAL(15, 2),
  contract_years INTEGER,
  notes TEXT,
  source_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.athlete_transfer_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies for athlete_transfer_history
CREATE POLICY "Anyone can view athlete transfer history"
ON public.athlete_transfer_history
FOR SELECT
USING (true);

CREATE POLICY "Admins can insert athlete transfer history"
ON public.athlete_transfer_history
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update athlete transfer history"
ON public.athlete_transfer_history
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete athlete transfer history"
ON public.athlete_transfer_history
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_transfer_history_athlete_id ON public.athlete_transfer_history(athlete_id);
CREATE INDEX IF NOT EXISTS idx_transfer_history_date ON public.athlete_transfer_history(transfer_date DESC);

-- Trigger for updated_at
CREATE TRIGGER update_athlete_transfer_history_updated_at
BEFORE UPDATE ON public.athlete_transfer_history
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- 3. CREATE athlete_injury_history TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.athlete_injury_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  athlete_id UUID NOT NULL REFERENCES public.athlete_profiles(id) ON DELETE CASCADE,
  injury_type TEXT NOT NULL,
  injury_zone TEXT, -- e.g., 'knee', 'ankle', 'muscle', 'head'
  start_date DATE NOT NULL,
  end_date DATE,
  is_current BOOLEAN DEFAULT false,
  days_missed INTEGER,
  games_missed INTEGER,
  severity TEXT DEFAULT 'minor', -- minor, moderate, major, season_ending
  description TEXT,
  source_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.athlete_injury_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies for athlete_injury_history
CREATE POLICY "Anyone can view athlete injury history"
ON public.athlete_injury_history
FOR SELECT
USING (true);

CREATE POLICY "Admins can insert athlete injury history"
ON public.athlete_injury_history
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update athlete injury history"
ON public.athlete_injury_history
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete athlete injury history"
ON public.athlete_injury_history
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Indexes
CREATE INDEX IF NOT EXISTS idx_injury_history_athlete_id ON public.athlete_injury_history(athlete_id);
CREATE INDEX IF NOT EXISTS idx_injury_history_current ON public.athlete_injury_history(is_current) WHERE is_current = true;
CREATE INDEX IF NOT EXISTS idx_injury_history_dates ON public.athlete_injury_history(start_date DESC, end_date);

-- Trigger for updated_at
CREATE TRIGGER update_athlete_injury_history_updated_at
BEFORE UPDATE ON public.athlete_injury_history
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- 4. CREATE athlete_market_values TABLE (time-series)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.athlete_market_values (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  athlete_id UUID NOT NULL REFERENCES public.athlete_profiles(id) ON DELETE CASCADE,
  recorded_date DATE NOT NULL,
  market_value DECIMAL(15, 2) NOT NULL,
  currency TEXT DEFAULT 'EUR',
  value_change DECIMAL(15, 2), -- change from previous record
  value_change_percentage DECIMAL(5, 2),
  source TEXT DEFAULT 'transfermarkt',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(athlete_id, recorded_date)
);

-- Enable RLS
ALTER TABLE public.athlete_market_values ENABLE ROW LEVEL SECURITY;

-- RLS Policies for athlete_market_values
CREATE POLICY "Anyone can view athlete market values"
ON public.athlete_market_values
FOR SELECT
USING (true);

CREATE POLICY "Admins can insert athlete market values"
ON public.athlete_market_values
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update athlete market values"
ON public.athlete_market_values
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete athlete market values"
ON public.athlete_market_values
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Indexes
CREATE INDEX IF NOT EXISTS idx_market_values_athlete_id ON public.athlete_market_values(athlete_id);
CREATE INDEX IF NOT EXISTS idx_market_values_date ON public.athlete_market_values(recorded_date DESC);

-- =====================================================
-- 5. ENHANCE athlete_transfer_rumors TABLE
-- =====================================================
ALTER TABLE public.athlete_transfer_rumors
ADD COLUMN IF NOT EXISTS interested_club TEXT,
ADD COLUMN IF NOT EXISTS interested_club_logo_url TEXT,
ADD COLUMN IF NOT EXISTS rumored_fee DECIMAL(15, 2),
ADD COLUMN IF NOT EXISTS fee_currency TEXT DEFAULT 'EUR',
ADD COLUMN IF NOT EXISTS contract_offer_years INTEGER,
ADD COLUMN IF NOT EXISTS probability_percentage INTEGER CHECK (probability_percentage >= 0 AND probability_percentage <= 100);

-- =====================================================
-- 6. POPULATE ATHLETE IDs (Transfermarkt & FotMob)
-- =====================================================

-- Arda Güler (Real Madrid)
UPDATE public.athlete_profiles
SET 
  transfermarkt_id = 861410,
  transfermarkt_slug = 'arda-guler',
  fotmob_id = 1316257
WHERE slug = 'arda-guler';

-- Kenan Yıldız (Juventus)
UPDATE public.athlete_profiles
SET 
  transfermarkt_id = 798650,
  transfermarkt_slug = 'kenan-yildiz',
  fotmob_id = 1183977
WHERE slug = 'kenan-yildiz';

-- Ferdi Kadıoğlu (Brighton)
UPDATE public.athlete_profiles
SET 
  transfermarkt_id = 346498,
  transfermarkt_slug = 'ferdi-kadioglu',
  fotmob_id = 869509
WHERE slug = 'ferdi-kadioglu';

-- Can Uzun (Eintracht Frankfurt)
UPDATE public.athlete_profiles
SET 
  transfermarkt_id = 886655,
  transfermarkt_slug = 'can-uzun',
  fotmob_id = 1241857
WHERE slug = 'can-uzun';

-- Berke Özer (Lille)
UPDATE public.athlete_profiles
SET 
  transfermarkt_id = 481886,
  transfermarkt_slug = 'berke-ozer',
  fotmob_id = 1002847
WHERE slug = 'berke-ozer';

-- Hakan Çalhanoğlu (Inter Milan)
UPDATE public.athlete_profiles
SET 
  transfermarkt_id = 35251,
  transfermarkt_slug = 'hakan-calhanoglu',
  fotmob_id = 175889
WHERE slug = 'hakan-calhanoglu';

-- Alperen Şengün (NBA - no Transfermarkt/FotMob IDs, already has balldontlie_id)
-- No update needed for basketball player

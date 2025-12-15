-- Create athlete efficiency rankings table for monthly comparisons
CREATE TABLE public.athlete_efficiency_rankings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  athlete_id UUID NOT NULL REFERENCES public.athlete_profiles(id) ON DELETE CASCADE,
  month DATE NOT NULL, -- First day of the month for this snapshot
  player_name TEXT NOT NULL,
  team TEXT NOT NULL,
  per NUMERIC,
  ts_pct NUMERIC,
  ws NUMERIC,
  efficiency_index NUMERIC,
  is_featured_athlete BOOLEAN DEFAULT false, -- True for our tracked athlete
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(athlete_id, month, player_name)
);

-- Enable RLS
ALTER TABLE public.athlete_efficiency_rankings ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Anyone can view efficiency rankings"
ON public.athlete_efficiency_rankings
FOR SELECT
USING (true);

CREATE POLICY "Admins can insert efficiency rankings"
ON public.athlete_efficiency_rankings
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update efficiency rankings"
ON public.athlete_efficiency_rankings
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete efficiency rankings"
ON public.athlete_efficiency_rankings
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Trigger for updated_at
CREATE TRIGGER update_athlete_efficiency_rankings_updated_at
BEFORE UPDATE ON public.athlete_efficiency_rankings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
-- Create athlete_news table for storing news articles about athletes
CREATE TABLE public.athlete_news (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  athlete_id UUID NOT NULL REFERENCES public.athlete_profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  summary TEXT,
  source_url TEXT NOT NULL,
  source_name TEXT,
  image_url TEXT,
  published_at TIMESTAMP WITH TIME ZONE,
  is_auto_crawled BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.athlete_news ENABLE ROW LEVEL SECURITY;

-- Anyone can view athlete news
CREATE POLICY "Anyone can view athlete news"
  ON public.athlete_news FOR SELECT
  USING (true);

-- Admins can insert athlete news
CREATE POLICY "Admins can insert athlete news"
  ON public.athlete_news FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Admins can update athlete news
CREATE POLICY "Admins can update athlete news"
  ON public.athlete_news FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins can delete athlete news
CREATE POLICY "Admins can delete athlete news"
  ON public.athlete_news FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Create index for faster queries
CREATE INDEX idx_athlete_news_athlete_id ON public.athlete_news(athlete_id);
CREATE INDEX idx_athlete_news_published_at ON public.athlete_news(published_at DESC);
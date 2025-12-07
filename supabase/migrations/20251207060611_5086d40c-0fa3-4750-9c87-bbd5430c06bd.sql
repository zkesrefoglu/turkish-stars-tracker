-- Create storage bucket for hero videos
INSERT INTO storage.buckets (id, name, public)
VALUES ('hero-videos', 'hero-videos', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public read access to hero videos
CREATE POLICY "Public can view hero videos"
ON storage.objects FOR SELECT
USING (bucket_id = 'hero-videos');

-- Allow admins to upload hero videos
CREATE POLICY "Admins can upload hero videos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'hero-videos' 
  AND public.has_role(auth.uid(), 'admin')
);

-- Allow admins to delete hero videos
CREATE POLICY "Admins can delete hero videos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'hero-videos' 
  AND public.has_role(auth.uid(), 'admin')
);

-- Create table for hero settings
CREATE TABLE public.hero_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  video_url TEXT,
  poster_url TEXT,
  title TEXT DEFAULT 'Turkish Stars Tracker',
  subtitle TEXT DEFAULT 'Follow your favorite Turkish athletes around the world',
  cta_text TEXT DEFAULT 'Explore Athletes',
  cta_href TEXT DEFAULT '/',
  overlay_opacity DECIMAL(3,2) DEFAULT 0.4,
  video_scale DECIMAL(3,2) DEFAULT 1.0,
  video_position_x INTEGER DEFAULT 50,
  video_position_y INTEGER DEFAULT 50,
  min_height_vh INTEGER DEFAULT 80,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.hero_settings ENABLE ROW LEVEL SECURITY;

-- Public read access
CREATE POLICY "Anyone can view hero settings"
ON public.hero_settings FOR SELECT
USING (true);

-- Admin write access
CREATE POLICY "Admins can update hero settings"
ON public.hero_settings FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert hero settings"
ON public.hero_settings FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Insert default settings
INSERT INTO public.hero_settings (video_url, poster_url)
VALUES ('/videos/eff56f640ac04ddd80dd79eba9c2818a.mp4', '/images/turkish-flag.jpg');

-- Add trigger for updated_at
CREATE TRIGGER update_hero_settings_updated_at
BEFORE UPDATE ON public.hero_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
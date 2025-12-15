-- Create sync_logs table for tracking last sync times
CREATE TABLE public.sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sync_type TEXT NOT NULL,
  synced_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'success',
  details JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.sync_logs ENABLE ROW LEVEL SECURITY;

-- Anyone can view sync logs
CREATE POLICY "Anyone can view sync logs"
ON public.sync_logs FOR SELECT
USING (true);

-- Admins can insert sync logs
CREATE POLICY "Admins can insert sync logs"
ON public.sync_logs FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Create athlete_videos table for short video carousel
CREATE TABLE public.athlete_videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id UUID NOT NULL REFERENCES public.athlete_profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  video_url TEXT NOT NULL,
  thumbnail_url TEXT,
  storage_path TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.athlete_videos ENABLE ROW LEVEL SECURITY;

-- Anyone can view active athlete videos
CREATE POLICY "Anyone can view athlete videos"
ON public.athlete_videos FOR SELECT
USING (true);

-- Admins can insert athlete videos
CREATE POLICY "Admins can insert athlete videos"
ON public.athlete_videos FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Admins can update athlete videos
CREATE POLICY "Admins can update athlete videos"
ON public.athlete_videos FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins can delete athlete videos
CREATE POLICY "Admins can delete athlete videos"
ON public.athlete_videos FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for updated_at
CREATE TRIGGER update_athlete_videos_updated_at
BEFORE UPDATE ON public.athlete_videos
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster queries
CREATE INDEX idx_athlete_videos_athlete_id ON public.athlete_videos(athlete_id);
CREATE INDEX idx_sync_logs_sync_type ON public.sync_logs(sync_type);

-- Create athlete-videos storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('athlete-videos', 'athlete-videos', true);

-- Storage policies for athlete-videos bucket
CREATE POLICY "Anyone can view athlete videos storage"
ON storage.objects FOR SELECT
USING (bucket_id = 'athlete-videos');

CREATE POLICY "Admins can upload athlete videos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'athlete-videos' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update athlete videos storage"
ON storage.objects FOR UPDATE
USING (bucket_id = 'athlete-videos' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete athlete videos storage"
ON storage.objects FOR DELETE
USING (bucket_id = 'athlete-videos' AND has_role(auth.uid(), 'admin'::app_role));
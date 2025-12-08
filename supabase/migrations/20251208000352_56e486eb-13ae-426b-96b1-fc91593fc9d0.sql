-- Create table for storing downloaded Instagram videos
CREATE TABLE public.instagram_videos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  instagram_url TEXT NOT NULL,
  shortcode TEXT,
  video_url TEXT NOT NULL,
  thumbnail_url TEXT,
  storage_path TEXT,
  username TEXT,
  caption TEXT,
  likes INTEGER DEFAULT 0,
  views INTEGER DEFAULT 0,
  downloaded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.instagram_videos ENABLE ROW LEVEL SECURITY;

-- Only admins can view/insert/delete videos
CREATE POLICY "Admins can view instagram videos"
  ON public.instagram_videos
  FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert instagram videos"
  ON public.instagram_videos
  FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete instagram videos"
  ON public.instagram_videos
  FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

-- Create storage bucket for instagram videos
INSERT INTO storage.buckets (id, name, public)
VALUES ('instagram-videos', 'instagram-videos', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for instagram videos bucket
CREATE POLICY "Admins can upload instagram videos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'instagram-videos' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Anyone can view instagram videos"
ON storage.objects FOR SELECT
USING (bucket_id = 'instagram-videos');

CREATE POLICY "Admins can delete instagram videos from storage"
ON storage.objects FOR DELETE
USING (bucket_id = 'instagram-videos' AND public.has_role(auth.uid(), 'admin'));
-- Add breaking_news column to news_articles table
ALTER TABLE public.news_articles 
ADD COLUMN IF NOT EXISTS breaking_news boolean DEFAULT false;
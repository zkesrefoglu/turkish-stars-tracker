-- Add new columns for carousel and featured articles
ALTER TABLE news_articles
ADD COLUMN IF NOT EXISTS is_carousel_featured BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS is_mid_featured BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS display_order INTEGER;

-- Update World category to Technology
UPDATE news_articles SET category = 'Technology' WHERE category = 'World';

-- Add index for better query performance on featured articles
CREATE INDEX IF NOT EXISTS idx_carousel_featured ON news_articles(is_carousel_featured, display_order, created_at) WHERE published = true;
CREATE INDEX IF NOT EXISTS idx_mid_featured ON news_articles(is_mid_featured, created_at) WHERE published = true;
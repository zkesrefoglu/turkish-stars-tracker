-- Add columns for pinning articles in carousel and category boxes
ALTER TABLE news_articles 
ADD COLUMN is_carousel_pinned boolean DEFAULT false,
ADD COLUMN category_pin_order integer DEFAULT NULL,
ADD COLUMN photo_credit text DEFAULT NULL;

-- Add comment for clarity
COMMENT ON COLUMN news_articles.is_carousel_pinned IS 'When true, this article will be pinned as the first item in the carousel';
COMMENT ON COLUMN news_articles.category_pin_order IS 'Order for pinning article within its category section (lower numbers appear first)';
COMMENT ON COLUMN news_articles.photo_credit IS 'Photo credit text to display under article images';
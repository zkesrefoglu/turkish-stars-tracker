-- Update valid categories for news articles
-- The new categories are: Economy, Defense, Life, Turkiye, World, Xtra, Editorial
-- Agenda is a special "catch-all" category that feeds other sections

-- Note: We cannot directly change enum values, so we'll work with what exists
-- Existing articles can be updated manually through the admin panel as needed

-- Add comment to document the category structure
COMMENT ON COLUMN news_articles.category IS 'Valid categories: Economy, Defense, Life, Turkiye, World, Xtra, Editorial. Agenda is the main feed.';
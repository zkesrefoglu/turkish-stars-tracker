-- Rename Xtra category to Editorial in news_articles table
UPDATE news_articles
SET category = 'Editorial'
WHERE category = 'Xtra';
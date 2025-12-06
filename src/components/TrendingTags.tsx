import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { TrendingUp } from "lucide-react";

interface TagWithCount {
  id: string;
  name: string;
  slug: string;
  count: number;
}

export const TrendingTags = () => {
  const [tags, setTags] = useState<TagWithCount[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTrendingTags();
  }, []);

  const fetchTrendingTags = async () => {
    try {
      // Get all article_tags with their tag info
      const { data: articleTags, error } = await supabase
        .from("article_tags")
        .select(`
          tag_id,
          tags (id, name, slug)
        `);

      if (error) throw error;

      // Count occurrences of each tag
      const tagCounts: Record<string, TagWithCount> = {};
      
      articleTags?.forEach((at: any) => {
        if (at.tags) {
          const tag = at.tags;
          if (tagCounts[tag.id]) {
            tagCounts[tag.id].count++;
          } else {
            tagCounts[tag.id] = {
              id: tag.id,
              name: tag.name,
              slug: tag.slug,
              count: 1,
            };
          }
        }
      });

      // Sort by count and take top 10
      const sortedTags = Object.values(tagCounts)
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      setTags(sortedTags);
    } catch (error) {
      console.error("Error fetching trending tags:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || tags.length === 0) {
    return null;
  }

  return (
    <div className="bg-card border border-border rounded-lg p-4">
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp className="w-5 h-5 text-primary" />
        <h3 className="font-semibold text-foreground">Trending Topics</h3>
      </div>
      <div className="flex flex-wrap gap-2">
        {tags.map((tag) => (
          <Link
            key={tag.id}
            to={`/tag/${tag.slug}`}
            className="inline-flex items-center gap-1 px-3 py-1.5 bg-muted hover:bg-primary hover:text-primary-foreground rounded-full text-sm transition-colors"
          >
            <span className="text-primary font-medium">#</span>
            <span>{tag.name}</span>
            <span className="text-xs text-muted-foreground ml-1">({tag.count})</span>
          </Link>
        ))}
      </div>
    </div>
  );
};

import { useState, useEffect } from 'react';
import { MiniHeader } from '@/components/v2/MiniHeader';
import { BottomNav } from '@/components/v2/BottomNav';
import { supabase } from '@/integrations/supabase/client';
import { Newspaper, ArrowSquareOut, Clock } from '@phosphor-icons/react';
import { formatDistanceToNow, parseISO } from 'date-fns';

interface NewsItem {
  id: string;
  athlete_id: string;
  title: string;
  source_url: string;
  source_name: string | null;
  image_url: string | null;
  published_at: string | null;
  athlete: {
    name: string;
    slug: string;
    photo_url: string | null;
  };
}

interface Athlete {
  id: string;
  name: string;
  slug: string;
}

const NewsPage = () => {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [selectedAthlete, setSelectedAthlete] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set());

  const handleImageError = (id: string) => {
    setFailedImages(prev => new Set(prev).add(id));
  };

  useEffect(() => {
    const fetchAthletes = async () => {
      const { data } = await supabase
        .from('athlete_profiles')
        .select('id, name, slug')
        .order('name');
      if (data) setAthletes(data);
    };
    fetchAthletes();
  }, []);

  useEffect(() => {
    const fetchNews = async () => {
      setLoading(true);
      let query = supabase
        .from('athlete_news')
        .select('*, athlete:athlete_profiles!athlete_id(name, slug, photo_url)')
        .order('published_at', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false })
        .limit(30);

      if (selectedAthlete) {
        query = query.eq('athlete_id', selectedAthlete);
      }

      const { data } = await query;
      if (data) setNews(data as NewsItem[]);
      setLoading(false);
    };

    fetchNews();
  }, [selectedAthlete]);

  const formatTimeAgo = (dateStr: string | null) => {
    if (!dateStr) return '';
    try {
      return formatDistanceToNow(parseISO(dateStr), { addSuffix: true });
    } catch {
      return '';
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <MiniHeader />
      
      <main className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        {/* Page Title */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center">
            <Newspaper size={20} weight="duotone" className="text-accent" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">News</h1>
            <p className="text-sm text-muted-foreground">Latest updates on Turkish athletes</p>
          </div>
        </div>

        {/* Athlete Filter */}
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
          <button
            onClick={() => setSelectedAthlete(null)}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
              selectedAthlete === null
                ? 'bg-accent text-accent-foreground'
                : 'bg-card border border-border text-muted-foreground hover:text-foreground'
            }`}
          >
            All Athletes
          </button>
          {athletes.map(athlete => (
            <button
              key={athlete.id}
              onClick={() => setSelectedAthlete(athlete.id)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                selectedAthlete === athlete.id
                  ? 'bg-accent text-accent-foreground'
                  : 'bg-card border border-border text-muted-foreground hover:text-foreground'
              }`}
            >
              {athlete.name.split(' ')[0]}
            </button>
          ))}
        </div>

        {/* News List */}
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-pulse text-muted-foreground">Loading news...</div>
          </div>
        ) : news.length === 0 ? (
          <div className="p-8 text-center">
            <Newspaper size={48} className="mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">No News Found</h3>
            <p className="text-muted-foreground">
              {selectedAthlete ? 'No news for this athlete yet' : 'Check back later for updates'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {news.map(item => (
              <a
                key={item.id}
                href={item.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="block bg-card border border-border rounded-xl overflow-hidden hover:border-accent/40 transition-all group"
              >
                <div className="flex gap-4 p-4">
                  {/* Thumbnail */}
                  <div className="flex-shrink-0">
                    {item.image_url && !failedImages.has(item.id) ? (
                      <img
                        src={item.image_url}
                        alt=""
                        className="w-24 h-24 object-cover rounded-lg"
                        onError={() => handleImageError(item.id)}
                      />
                    ) : (
                      <div className="w-24 h-24 bg-muted rounded-lg flex items-center justify-center">
                        <Newspaper size={32} className="text-muted-foreground" />
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-foreground line-clamp-2 group-hover:text-accent transition-colors">
                      {item.title}
                    </h3>
                    
                    <div className="mt-2 flex items-center gap-2">
                      <img
                        src={item.athlete.photo_url || '/placeholder.svg'}
                        alt={item.athlete.name}
                        className="w-5 h-5 rounded-full object-cover"
                      />
                      <span className="text-sm text-muted-foreground">{item.athlete.name}</span>
                    </div>

                    <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                      {item.source_name && (
                        <span className="flex items-center gap-1">
                          <ArrowSquareOut size={12} />
                          {item.source_name}
                        </span>
                      )}
                      {item.published_at && (
                        <span className="flex items-center gap-1">
                          <Clock size={12} />
                          {formatTimeAgo(item.published_at)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </a>
            ))}
          </div>
        )}
      </main>
      
      <BottomNav />
    </div>
  );
};

export default NewsPage;

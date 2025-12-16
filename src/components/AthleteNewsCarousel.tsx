import { useRef, useEffect } from "react";
import useEmblaCarousel from "embla-carousel-react";
import Autoplay from "embla-carousel-autoplay";
import { Newspaper, ExternalLink } from "lucide-react";

interface NewsItem {
  id: string;
  title: string;
  source_url: string;
  source_name: string | null;
  image_url: string | null;
  published_at: string | null;
}

interface AthleteNewsCarouselProps {
  news: NewsItem[];
}

const AthleteNewsCarousel = ({ news }: AthleteNewsCarouselProps) => {
  const autoplayRef = useRef(
    Autoplay({ delay: 3500, stopOnInteraction: false, stopOnMouseEnter: true })
  );

  const [emblaRef] = useEmblaCarousel(
    { 
      loop: news.length >= 3,
      align: "start",
      dragFree: true,
      containScroll: "trimSnaps"
    },
    [autoplayRef.current]
  );

  if (!news || news.length === 0) return null;

  const displayNews = news.slice(0, 5);

  return (
    <div className="mt-8 animate-fade-in">
      <div className="bg-secondary/40 backdrop-blur-sm border border-border/30 rounded-xl p-5 border-l-2 border-l-primary/50">
        <div className="flex items-center gap-2 mb-4">
          <Newspaper className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">
            Latest News
          </h3>
        </div>
      
      <div className="overflow-hidden" ref={emblaRef}>
        <div className="flex gap-3">
          {displayNews.map((item) => (
            <a
              key={item.id}
              href={item.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-shrink-0 w-[170px] group"
            >
              <div className="bg-card border border-border/50 rounded-lg overflow-hidden transition-all duration-300 hover:border-primary/50 hover:scale-[1.02] hover:shadow-lg hover:shadow-primary/10">
                {/* Image */}
                <div className="aspect-video bg-muted relative overflow-hidden">
                  {item.image_url ? (
                    <img
                      src={item.image_url}
                      alt=""
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Newspaper className="h-6 w-6 text-muted-foreground/50" />
                    </div>
                  )}
                  <div className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <ExternalLink className="h-3 w-3 text-white drop-shadow-lg" />
                  </div>
                </div>
                
                {/* Content */}
                <div className="p-2.5">
                  <h4 className="text-xs font-medium text-foreground line-clamp-2 leading-tight mb-1.5 min-h-[2rem]">
                    {item.title}
                  </h4>
                  {item.source_name && (
                    <p className="text-[10px] text-muted-foreground truncate">
                      {item.source_name}
                    </p>
                  )}
                </div>
              </div>
            </a>
          ))}
        </div>
      </div>
      </div>
    </div>
  );
};

export default AthleteNewsCarousel;

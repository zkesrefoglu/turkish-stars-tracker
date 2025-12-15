import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ChevronLeft, ChevronRight, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import useEmblaCarousel from "embla-carousel-react";

interface AthleteVideo {
  id: string;
  title: string;
  video_url: string;
  thumbnail_url: string | null;
  display_order: number;
}

interface AthleteVideoCarouselProps {
  athleteId: string;
}

export function AthleteVideoCarousel({ athleteId }: AthleteVideoCarouselProps) {
  const [videos, setVideos] = useState<AthleteVideo[]>([]);
  const [playingVideoId, setPlayingVideoId] = useState<string | null>(null);
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);
  const videoRefs = useRef<Map<string, HTMLVideoElement>>(new Map());
  
  const [emblaRef, emblaApi] = useEmblaCarousel({
    align: "start",
    containScroll: "trimSnaps",
    dragFree: true,
  });

  useEffect(() => {
    const fetchVideos = async () => {
      const { data } = await supabase
        .from("athlete_videos")
        .select("*")
        .eq("athlete_id", athleteId)
        .eq("is_active", true)
        .order("display_order", { ascending: true })
        .limit(10);

      if (data) {
        setVideos(data);
      }
    };

    fetchVideos();
  }, [athleteId]);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setCanScrollPrev(emblaApi.canScrollPrev());
    setCanScrollNext(emblaApi.canScrollNext());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    onSelect();
    emblaApi.on("select", onSelect);
    emblaApi.on("reInit", onSelect);
  }, [emblaApi, onSelect]);

  const scrollPrev = useCallback(() => {
    emblaApi?.scrollPrev();
  }, [emblaApi]);

  const scrollNext = useCallback(() => {
    emblaApi?.scrollNext();
  }, [emblaApi]);

  const handleVideoClick = (video: AthleteVideo) => {
    const videoEl = videoRefs.current.get(video.id);
    
    if (playingVideoId === video.id) {
      // Pause current video
      videoEl?.pause();
      setPlayingVideoId(null);
    } else {
      // Pause any other playing video
      if (playingVideoId) {
        const prevVideoEl = videoRefs.current.get(playingVideoId);
        prevVideoEl?.pause();
      }
      // Play this video
      videoEl?.play();
      setPlayingVideoId(video.id);
    }
  };

  const setVideoRef = (id: string, el: HTMLVideoElement | null) => {
    if (el) {
      videoRefs.current.set(id, el);
    } else {
      videoRefs.current.delete(id);
    }
  };

  if (videos.length === 0) {
    return null;
  }

  return (
    <div className="relative py-6">
      <h3 className="text-lg font-semibold text-foreground mb-4">Highlights</h3>
      
      <div className="relative group">
        {/* Navigation Arrows */}
        {canScrollPrev && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-background/80 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity hidden md:flex"
            onClick={scrollPrev}
          >
            <ChevronLeft className="h-6 w-6" />
          </Button>
        )}
        
        {canScrollNext && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-background/80 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity hidden md:flex"
            onClick={scrollNext}
          >
            <ChevronRight className="h-6 w-6" />
          </Button>
        )}

        {/* Carousel */}
        <div ref={emblaRef} className="overflow-hidden">
          <div className="flex gap-3">
            {videos.map((video) => {
              const isPlaying = playingVideoId === video.id;
              
              return (
                <div
                  key={video.id}
                  className="flex-shrink-0 w-[280px] md:w-[320px] cursor-pointer group/card"
                  onClick={() => handleVideoClick(video)}
                >
                  <div className="relative aspect-[9/16] rounded-xl overflow-hidden bg-muted">
                    <video
                      ref={(el) => setVideoRef(video.id, el)}
                      src={video.video_url}
                      poster={video.thumbnail_url || undefined}
                      className="w-full h-full object-cover"
                      preload="metadata"
                      muted={false}
                      playsInline
                      controls={isPlaying}
                      onEnded={() => setPlayingVideoId(null)}
                    />
                    
                    {/* Overlay gradient - hide when playing */}
                    {!isPlaying && (
                      <>
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />
                        
                        {/* Play button overlay */}
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                          <div className="w-14 h-14 rounded-full bg-white/90 flex items-center justify-center transition-transform group-hover/card:scale-110">
                            <Play className="w-6 h-6 text-black fill-black ml-0.5" />
                          </div>
                        </div>
                        
                        {/* Title */}
                        <div className="absolute bottom-0 left-0 right-0 p-3 pointer-events-none">
                          <p className="text-white text-sm font-medium line-clamp-2 leading-tight">
                            {video.title}
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

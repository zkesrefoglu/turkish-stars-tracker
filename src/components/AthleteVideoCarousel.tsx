import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ChevronLeft, ChevronRight, Play, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
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
  const [selectedVideo, setSelectedVideo] = useState<AthleteVideo | null>(null);
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);
  
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
            {videos.map((video) => (
              <div
                key={video.id}
                className="flex-shrink-0 w-[280px] md:w-[320px] cursor-pointer group/card"
                onClick={() => setSelectedVideo(video)}
              >
                <div className="relative aspect-[9/16] rounded-xl overflow-hidden bg-muted">
                  {video.thumbnail_url ? (
                    <img
                      src={video.thumbnail_url}
                      alt={video.title}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover/card:scale-105"
                    />
                  ) : (
                    <video
                      src={video.video_url}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover/card:scale-105"
                      preload="metadata"
                      muted
                      playsInline
                    />
                  )}
                  
                  {/* Overlay gradient */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                  
                  {/* Play button overlay */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/card:opacity-100 transition-opacity">
                    <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center">
                      <Play className="w-5 h-5 text-black fill-black ml-0.5" />
                    </div>
                  </div>
                  
                  {/* Title */}
                  <div className="absolute bottom-0 left-0 right-0 p-3">
                    <p className="text-white text-sm font-medium line-clamp-2 leading-tight">
                      {video.title}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Video Modal */}
      <Dialog open={!!selectedVideo} onOpenChange={() => setSelectedVideo(null)}>
        <DialogContent className="max-w-3xl p-0 bg-black border-none overflow-hidden">
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-2 right-2 z-50 text-white hover:bg-white/20"
            onClick={() => setSelectedVideo(null)}
          >
            <X className="h-5 w-5" />
          </Button>
          
          {selectedVideo && (
            <div className="relative aspect-video">
              <video
                src={selectedVideo.video_url}
                controls
                autoPlay
                className="w-full h-full"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

import { Instagram, ExternalLink, ChevronLeft, ChevronRight } from "lucide-react";
import useEmblaCarousel from "embla-carousel-react";
import { useCallback } from "react";

interface InstagramSocialSectionProps {
  instagramUrl: string | null;
  athleteName: string;
}

export const InstagramSocialSection = ({ instagramUrl, athleteName }: InstagramSocialSectionProps) => {
  const [emblaRef, emblaApi] = useEmblaCarousel({ 
    loop: true, 
    align: "start",
    dragFree: true 
  });

  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);

  // Extract username from Instagram URL
  const getUsername = (url: string | null): string | null => {
    if (!url) return null;
    const match = url.match(/instagram\.com\/([^/?]+)/);
    return match ? match[1] : null;
  };

  const username = getUsername(instagramUrl);

  if (!instagramUrl || !username) {
    return null;
  }

  // Placeholder slides for carousel effect
  const placeholderSlides = [
    { id: 1, gradient: "from-purple-600 via-pink-500 to-orange-400" },
    { id: 2, gradient: "from-pink-500 via-red-500 to-yellow-500" },
    { id: 3, gradient: "from-indigo-500 via-purple-500 to-pink-500" },
    { id: 4, gradient: "from-orange-400 via-pink-500 to-purple-600" },
    { id: 5, gradient: "from-yellow-400 via-orange-500 to-red-500" },
  ];

  return (
    <section className="bg-black py-16 mt-8">
      <div className="container-custom">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600 p-[2px]">
              <div className="w-full h-full rounded-full bg-black flex items-center justify-center">
                <Instagram className="w-6 h-6 text-white" />
              </div>
            </div>
            <div>
              <p className="text-white font-semibold text-lg">@{username}</p>
              <p className="text-gray-400 text-sm">Follow on Instagram</p>
            </div>
          </div>
          <a
            href={instagramUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-purple-600 via-pink-600 to-orange-500 text-white rounded-lg transition-all duration-300 text-sm font-medium hover:opacity-90"
          >
            <span>View Profile</span>
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>

        {/* Carousel */}
        <div className="relative group">
          {/* Navigation Arrows */}
          <button
            onClick={scrollPrev}
            className="absolute left-2 top-1/2 -translate-y-1/2 z-10 w-10 h-10 bg-black/60 hover:bg-black/80 rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <button
            onClick={scrollNext}
            className="absolute right-2 top-1/2 -translate-y-1/2 z-10 w-10 h-10 bg-black/60 hover:bg-black/80 rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <ChevronRight className="w-6 h-6" />
          </button>

          {/* Carousel Container */}
          <div ref={emblaRef} className="overflow-hidden rounded-xl">
            <div className="flex gap-3">
              {placeholderSlides.map((slide) => (
                <a
                  key={slide.id}
                  href={instagramUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-none w-[200px] sm:w-[240px] md:w-[280px] aspect-square relative rounded-xl overflow-hidden group/slide cursor-pointer"
                >
                  <div className={`absolute inset-0 bg-gradient-to-br ${slide.gradient} opacity-30`} />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center group-hover/slide:scale-110 transition-transform">
                        <Instagram className="w-8 h-8 text-white" />
                      </div>
                      <p className="text-white/80 text-sm font-medium">View on Instagram</p>
                    </div>
                  </div>
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* Footer CTA */}
        <div className="mt-8 text-center">
          <a
            href={instagramUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-sm"
          >
            <span>See all posts from {athleteName}</span>
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      </div>
    </section>
  );
};

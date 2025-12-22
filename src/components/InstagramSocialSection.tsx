import { useEffect, useRef, useState } from "react";
import { Instagram, ExternalLink } from "lucide-react";

interface InstagramSocialSectionProps {
  instagramUrl: string | null;
  athleteName: string;
}

export const InstagramSocialSection = ({ instagramUrl, athleteName }: InstagramSocialSectionProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [embedLoaded, setEmbedLoaded] = useState(false);
  const [embedError, setEmbedError] = useState(false);

  // Extract username from Instagram URL
  const getUsername = (url: string | null): string | null => {
    if (!url) return null;
    const match = url.match(/instagram\.com\/([^/?]+)/);
    return match ? match[1] : null;
  };

  const username = getUsername(instagramUrl);

  useEffect(() => {
    if (!username || !containerRef.current) return;

    // Load Instagram embed script
    const loadInstagramEmbed = () => {
      // Check if script already exists
      if (document.querySelector('script[src*="instagram.com/embed.js"]')) {
        // If already loaded, just process embeds
        if ((window as any).instgrm) {
          (window as any).instgrm.Embeds.process();
          setEmbedLoaded(true);
        }
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://www.instagram.com/embed.js';
      script.async = true;
      script.defer = true;
      script.onload = () => {
        if ((window as any).instgrm) {
          (window as any).instgrm.Embeds.process();
          setEmbedLoaded(true);
        }
      };
      script.onerror = () => {
        setEmbedError(true);
      };
      document.body.appendChild(script);
    };

    // Small delay to ensure DOM is ready
    const timer = setTimeout(loadInstagramEmbed, 100);
    return () => clearTimeout(timer);
  }, [username]);

  if (!instagramUrl || !username) {
    return null;
  }

  return (
    <section className="bg-black py-16 mt-8">
      <div className="container-custom">
        {/* Header */}
        <div className="flex items-center justify-between mb-10">
          <div className="flex items-center gap-4">
            <Instagram className="w-8 h-8 text-white" />
            <h2 className="text-xl md:text-2xl font-headline font-medium text-white">
              Follow {athleteName} on Instagram
            </h2>
          </div>
          <a
            href={instagramUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-full transition-all duration-300 text-sm font-medium group"
          >
            <span>@{username}</span>
            <ExternalLink className="w-4 h-4 opacity-70 group-hover:opacity-100 transition-opacity" />
          </a>
        </div>

        {/* Instagram Embed Area */}
        <div ref={containerRef} className="flex justify-center">
          {embedError ? (
            <div className="text-center py-12">
              <p className="text-gray-400 mb-4">Unable to load Instagram content</p>
              <a
                href={instagramUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 via-pink-600 to-orange-500 text-white rounded-full hover:opacity-90 transition-opacity font-medium"
              >
                <Instagram className="w-5 h-5" />
                Visit Profile on Instagram
              </a>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full">
              {/* Single embed showing latest content */}
              <div className="md:col-span-2 lg:col-span-3 flex justify-center">
                <blockquote 
                  className="instagram-media" 
                  data-instgrm-permalink={`https://www.instagram.com/${username}/`}
                  data-instgrm-version="14"
                  style={{ 
                    background: '#1a1a1a',
                    border: 0,
                    borderRadius: '12px',
                    boxShadow: '0 0 1px 0 rgba(0,0,0,0.5),0 1px 10px 0 rgba(0,0,0,0.15)',
                    margin: '1px',
                    maxWidth: '540px',
                    minWidth: '326px',
                    padding: 0,
                    width: 'calc(100% - 2px)'
                  }}
                >
                  {/* Fallback content while loading */}
                  {!embedLoaded && (
                    <div className="p-8 text-center">
                      <div className="animate-pulse flex flex-col items-center gap-4">
                        <div className="w-16 h-16 rounded-full bg-gray-700" />
                        <div className="h-4 bg-gray-700 rounded w-32" />
                        <div className="h-3 bg-gray-700 rounded w-48" />
                      </div>
                      <p className="text-gray-500 mt-6 text-sm">Loading Instagram...</p>
                    </div>
                  )}
                </blockquote>
              </div>
            </div>
          )}
        </div>

        {/* View More Link */}
        <div className="text-center mt-10">
          <a
            href={instagramUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-sm"
          >
            <span>View all posts on Instagram</span>
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      </div>
    </section>
  );
};

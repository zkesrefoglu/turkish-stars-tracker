import React, { useRef, useState } from 'react';
import { Play, Pause, ChevronDown, Star } from 'lucide-react';
import { Link } from 'react-router-dom';

interface HeroVideoProps {
  mp4Src: string;
  webmSrc?: string;
  posterSrc?: string;
  title?: string;
  subtitle?: string;
  ctaText?: string;
  ctaHref?: string;
  overlayOpacity?: number;
  videoScale?: number;
  videoPositionX?: number;
  videoPositionY?: number;
  minHeightVh?: number;
}

const HeroVideo: React.FC<HeroVideoProps> = ({
  mp4Src,
  webmSrc,
  posterSrc,
  title = "Your Story Begins Here",
  subtitle = "Discover something extraordinary",
  ctaText = "Explore",
  ctaHref = "#",
  overlayOpacity = 0.5,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPaused, setIsPaused] = useState(false);

  const togglePlayback = () => {
    if (videoRef.current) {
      if (isPaused) {
        videoRef.current.play();
      } else {
        videoRef.current.pause();
      }
      setIsPaused(!isPaused);
    }
  };

  const isExternalLink = ctaHref.startsWith('http');

  const scrollToContent = () => {
    window.scrollTo({ top: window.innerHeight, behavior: 'smooth' });
  };

  return (
    <section className="relative w-full min-h-screen overflow-hidden bg-black">
      {/* Background Video with Ken Burns effect */}
      <video
        ref={videoRef}
        autoPlay
        muted
        loop
        playsInline
        poster={posterSrc}
        className="absolute inset-0 w-full h-full object-cover z-[1] animate-ken-burns"
        aria-hidden="true"
      >
        {webmSrc && <source src={webmSrc} type="video/webm" />}
        <source src={mp4Src} type="video/mp4" />
        Your browser does not support the video tag.
      </video>

      {/* Enhanced Dark Overlay with gradient */}
      <div 
        className="absolute inset-0 z-[2]"
        style={{
          background: `linear-gradient(
            180deg,
            rgba(0, 0, 0, ${overlayOpacity * 0.3}) 0%,
            rgba(0, 0, 0, ${overlayOpacity * 0.6}) 40%,
            rgba(0, 0, 0, ${overlayOpacity}) 70%,
            rgba(0, 0, 0, ${overlayOpacity * 1.2}) 100%
          )`
        }}
        aria-hidden="true" 
      />

      {/* Radial vignette for drama */}
      <div 
        className="absolute inset-0 z-[2] pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at center, transparent 0%, rgba(0,0,0,0.4) 100%)'
        }}
        aria-hidden="true"
      />

      {/* Content with staggered animations */}
      <div className="absolute inset-0 z-[3] flex flex-col items-center justify-center text-center text-white p-8 pt-24">
        <div className="max-w-[1000px]">
          {/* Decorative star */}
          <div className="animate-fade-in-up opacity-0 [animation-delay:200ms] [animation-fill-mode:forwards] mb-6">
            <Star className="w-8 h-8 mx-auto text-accent fill-accent animate-pulse" />
          </div>
          
          {/* Title with dramatic entrance */}
          <h1 className="animate-fade-in-up opacity-0 [animation-delay:400ms] [animation-fill-mode:forwards] font-headline text-[clamp(2.5rem,10vw,6rem)] font-bold tracking-tight leading-[1.05] mb-6 drop-shadow-2xl bg-gradient-to-b from-white via-white to-white/70 bg-clip-text text-transparent">
            {title}
          </h1>
          
          {/* Subtitle */}
          <p className="animate-fade-in-up opacity-0 [animation-delay:600ms] [animation-fill-mode:forwards] font-body text-[clamp(1rem,3vw,1.5rem)] font-light tracking-[0.3em] uppercase text-white/80 mb-12">
            {subtitle}
          </p>
          
          {/* Enhanced CTA Button */}
          <div className="animate-fade-in-up opacity-0 [animation-delay:800ms] [animation-fill-mode:forwards]">
            {isExternalLink ? (
              <a 
                href={ctaHref}
                target="_blank"
                rel="noopener noreferrer"
                className="group relative inline-flex items-center gap-4 font-body text-base font-semibold tracking-widest uppercase text-white py-5 px-12 bg-gradient-to-r from-accent/80 to-accent rounded-full transition-all duration-500 hover:scale-105 hover:shadow-[0_0_40px_rgba(var(--accent-rgb),0.5)] overflow-hidden"
              >
                <span className="relative z-10">{ctaText}</span>
                <span className="relative z-10 transition-transform duration-300 group-hover:translate-x-2">→</span>
                <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
              </a>
            ) : (
              <Link 
                to={ctaHref}
                className="group relative inline-flex items-center gap-4 font-body text-base font-semibold tracking-widest uppercase text-white py-5 px-12 bg-gradient-to-r from-accent/80 to-accent rounded-full transition-all duration-500 hover:scale-105 hover:shadow-[0_0_40px_rgba(var(--accent-rgb),0.5)] overflow-hidden"
              >
                <span className="relative z-10">{ctaText}</span>
                <span className="relative z-10 transition-transform duration-300 group-hover:translate-x-2">→</span>
                <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Pause/Play Button */}
      <button
        onClick={togglePlayback}
        className="absolute bottom-8 right-8 z-[4] w-12 h-12 flex items-center justify-center bg-white/10 border border-white/30 rounded-full text-white cursor-pointer backdrop-blur-md transition-all duration-300 hover:bg-white/25 hover:scale-110"
        aria-label={isPaused ? "Play background video" : "Pause background video"}
      >
        {isPaused ? (
          <Play className="w-5 h-5 fill-current" />
        ) : (
          <Pause className="w-5 h-5 fill-current" />
        )}
      </button>

      {/* Scroll Indicator */}
      <button 
        onClick={scrollToContent}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 z-[4] flex flex-col items-center gap-2 text-white/70 hover:text-white transition-colors cursor-pointer group"
        aria-label="Scroll to content"
      >
        <span className="text-xs tracking-widest uppercase font-light">Scroll</span>
        <ChevronDown className="w-6 h-6 animate-bounce" />
      </button>
    </section>
  );
};

export default HeroVideo;

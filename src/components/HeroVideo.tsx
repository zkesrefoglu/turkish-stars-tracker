import React, { useRef, useState } from 'react';
import { Play, Pause } from 'lucide-react';
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
  overlayOpacity = 0.4,
  videoScale = 1.0,
  videoPositionX = 50,
  videoPositionY = 50,
  minHeightVh = 80,
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

  return (
    <section 
      className="relative w-full overflow-hidden bg-black"
      style={{ aspectRatio: '16/9' }}
    >
      {/* Background Video */}
      <video
        ref={videoRef}
        autoPlay
        muted
        loop
        playsInline
        poster={posterSrc}
        className="absolute inset-0 w-full h-full object-cover z-[1]"
        aria-hidden="true"
      >
        {webmSrc && <source src={webmSrc} type="video/webm" />}
        <source src={mp4Src} type="video/mp4" />
        Your browser does not support the video tag.
      </video>

      {/* Dark Overlay */}
      <div 
        className="absolute inset-0 z-[2]"
        style={{
          background: `linear-gradient(
            to bottom,
            rgba(0, 0, 0, ${overlayOpacity * 0.5}) 0%,
            rgba(0, 0, 0, ${overlayOpacity}) 50%,
            rgba(0, 0, 0, ${overlayOpacity * 0.8}) 100%
          )`
        }}
        aria-hidden="true" 
      />

      {/* Content */}
      <div className="absolute inset-0 z-[3] flex flex-col items-center justify-center text-center text-white p-8">
        <div className="max-w-[900px]">
          <h1 className="font-headline text-[clamp(2.5rem,8vw,5rem)] font-normal tracking-tight leading-[1.1] mb-6 drop-shadow-2xl">
            {title}
          </h1>
          <p className="font-body text-[clamp(1rem,2.5vw,1.25rem)] font-light tracking-widest uppercase opacity-90 mb-10">
            {subtitle}
          </p>
        {isExternalLink ? (
          <a 
            href={ctaHref}
            target="_blank"
            rel="noopener noreferrer"
            className="group inline-flex items-center gap-3 font-body text-sm font-medium tracking-widest uppercase text-white py-4 px-8 border border-white/40 bg-white/5 backdrop-blur-md transition-all duration-300 hover:bg-white/15 hover:border-white/80"
          >
            {ctaText}
            <span className="transition-transform duration-300 group-hover:translate-x-1">→</span>
          </a>
        ) : (
          <Link 
            to={ctaHref}
            className="group inline-flex items-center gap-3 font-body text-sm font-medium tracking-widest uppercase text-white py-4 px-8 border border-white/40 bg-white/5 backdrop-blur-md transition-all duration-300 hover:bg-white/15 hover:border-white/80"
          >
            {ctaText}
            <span className="transition-transform duration-300 group-hover:translate-x-1">→</span>
          </Link>
        )}
        </div>
      </div>

      {/* Pause/Play Button for Accessibility */}
      <button
        onClick={togglePlayback}
        className="absolute bottom-8 right-8 z-[4] w-11 h-11 flex items-center justify-center bg-black/50 border border-white/20 rounded-full text-white cursor-pointer backdrop-blur-md transition-all duration-300 hover:bg-white/20"
        aria-label={isPaused ? "Play background video" : "Pause background video"}
      >
        {isPaused ? (
          <Play className="w-4 h-4 fill-current" />
        ) : (
          <Pause className="w-4 h-4 fill-current" />
        )}
      </button>

      {/* Scroll Indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-[4]">
        <div className="w-px h-[60px] bg-gradient-to-b from-white/80 to-transparent animate-pulse" />
      </div>
    </section>
  );
};

export default HeroVideo;

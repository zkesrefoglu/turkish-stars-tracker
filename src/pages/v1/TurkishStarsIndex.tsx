import HeroVideo from '@/components/HeroVideo';
import { useHeroSettings } from '@/hooks/useHeroSettings';
import { Loader2 } from 'lucide-react';

const TurkishStarsIndex = () => {
  const { settings, loading } = useHeroSettings();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <HeroVideo
        mp4Src={settings.video_url || '/videos/eff56f640ac04ddd80dd79eba9c2818a.mp4'}
        posterSrc={settings.poster_url || '/images/turkish-flag.jpg'}
        title={settings.title}
        subtitle={settings.subtitle}
        ctaText={settings.cta_text}
        ctaHref={settings.cta_href}
        overlayOpacity={settings.overlay_opacity}
        videoScale={settings.video_scale}
        videoPositionX={settings.video_position_x}
        videoPositionY={settings.video_position_y}
        minHeightVh={settings.min_height_vh}
      />
    </div>
  );
};

export default TurkishStarsIndex;

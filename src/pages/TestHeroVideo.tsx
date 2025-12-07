import HeroVideo from '@/components/HeroVideo';

const TestHeroVideo = () => {
  return (
    <div className="min-h-screen bg-background">
      <HeroVideo
        mp4Src="/videos/eff56f640ac04ddd80dd79eba9c2818a.mp4"
        posterSrc="/images/turkish-flag.jpg"
        title="Turkish Stars Tracker"
        subtitle="Follow your favorite Turkish athletes around the world"
        ctaText="Explore Athletes"
        ctaHref="/"
      />
      
      {/* Content below the hero to test scroll */}
      <div className="container mx-auto py-16 px-4">
        <h2 className="text-3xl font-headline text-foreground mb-4">
          Welcome to Turkish Stars Tracker
        </h2>
        <p className="text-muted-foreground max-w-2xl">
          Follow your favorite Turkish athletes competing around the world. 
          Track their stats, upcoming matches, and latest news all in one place.
        </p>
      </div>
    </div>
  );
};

export default TestHeroVideo;

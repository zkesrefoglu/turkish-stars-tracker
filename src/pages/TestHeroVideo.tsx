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
          HeroVideo Component Test
        </h2>
        <p className="text-muted-foreground max-w-2xl">
          This is a test page for the HeroVideo component. The video above is a sample placeholder. 
          Replace the mp4Src prop with your actual video file once uploaded.
        </p>
        <div className="mt-8 p-4 bg-muted rounded-lg">
          <h3 className="font-semibold text-foreground mb-2">Component Props Used:</h3>
          <pre className="text-sm text-muted-foreground overflow-x-auto">
{`<HeroVideo
  mp4Src="https://storage.googleapis.com/.../sample.mp4"
  posterSrc="/images/turkish-flag.jpg"
  title="Turkish Stars Tracker"
  subtitle="Follow your favorite Turkish athletes around the world"
  ctaText="Explore Athletes"
  ctaHref="/"
/>`}
          </pre>
        </div>
      </div>
    </div>
  );
};

export default TestHeroVideo;

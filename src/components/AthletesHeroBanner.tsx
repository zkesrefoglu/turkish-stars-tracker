import { Star } from "lucide-react";

export const AthletesHeroBanner = () => {
  return (
    <div className="relative overflow-hidden bg-gradient-to-r from-destructive via-destructive/90 to-destructive/80">
      {/* Animated background pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,_hsl(var(--background))_1px,_transparent_1px)] bg-[length:20px_20px]" />
      </div>
      
      {/* Floating star decorations */}
      <div className="absolute top-4 left-[10%] animate-pulse">
        <Star className="w-6 h-6 text-background/30 fill-background/20" />
      </div>
      <div className="absolute top-8 left-[25%] animate-pulse" style={{ animationDelay: '0.3s' }}>
        <Star className="w-4 h-4 text-background/25 fill-background/15" />
      </div>
      <div className="absolute bottom-6 right-[15%] animate-pulse" style={{ animationDelay: '0.6s' }}>
        <Star className="w-5 h-5 text-background/30 fill-background/20" />
      </div>
      <div className="absolute top-6 right-[30%] animate-pulse" style={{ animationDelay: '0.9s' }}>
        <Star className="w-3 h-3 text-background/20 fill-background/10" />
      </div>
      <div className="absolute bottom-4 left-[40%] animate-pulse" style={{ animationDelay: '1.2s' }}>
        <Star className="w-4 h-4 text-background/25 fill-background/15" />
      </div>

      {/* Crescent moon decoration (Turkish flag inspired) */}
      <div className="absolute left-[5%] top-1/2 -translate-y-1/2 opacity-10">
        <div className="w-24 h-24 md:w-32 md:h-32 rounded-full border-[6px] md:border-8 border-background relative">
          <div className="absolute w-20 h-20 md:w-26 md:h-26 rounded-full bg-destructive -right-3 top-1/2 -translate-y-1/2" />
        </div>
      </div>

      {/* Main content */}
      <div className="container-custom relative z-10 py-10 md:py-14">
        <div className="flex flex-col items-center text-center">
          {/* Stars row */}
          <div className="flex items-center gap-2 mb-3 animate-fade-in-up">
            <Star className="w-4 h-4 md:w-5 md:h-5 text-background fill-background" />
            <Star className="w-5 h-5 md:w-6 md:h-6 text-background fill-background" />
            <Star className="w-4 h-4 md:w-5 md:h-5 text-background fill-background" />
          </div>
          
          {/* Main title */}
          <h1 
            className="text-3xl md:text-5xl lg:text-6xl font-headline font-bold text-background tracking-tight mb-2 animate-fade-in-up"
            style={{ animationDelay: '0.1s' }}
          >
            TURKISH STARS
          </h1>
          
          {/* Subtitle */}
          <p 
            className="text-background/80 text-sm md:text-base font-ui uppercase tracking-[0.2em] animate-fade-in-up"
            style={{ animationDelay: '0.2s' }}
          >
            Track Your Favorite Athletes
          </p>
          
          {/* Decorative line */}
          <div 
            className="mt-4 w-24 md:w-32 h-0.5 bg-background/40 rounded-full animate-fade-in-up"
            style={{ animationDelay: '0.3s' }}
          />
        </div>
      </div>

      {/* Bottom gradient fade */}
      <div className="absolute bottom-0 left-0 right-0 h-4 bg-gradient-to-t from-background/10 to-transparent" />
    </div>
  );
};

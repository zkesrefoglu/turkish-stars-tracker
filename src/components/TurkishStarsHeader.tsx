import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Menu, X, Star } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

export const TurkishStarsHeader = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // Trigger animations after mount
    const timer = setTimeout(() => setIsLoaded(true), 100);
    return () => clearTimeout(timer);
  }, []);

  return (
    <header className="sticky top-0 z-50 bg-gradient-to-br from-background to-muted/30 backdrop-blur-sm border-b border-border">
      <div className="container mx-auto px-6">
        <div className="flex items-center justify-between h-24">
          {/* Left Section: Logo + Tagline */}
          <Link to="/" className="flex items-center gap-4 group">
            {/* Animated Star */}
            <div className="relative">
              <Star 
                className={`absolute -top-1 -right-1 w-4 h-4 text-accent fill-accent transition-all duration-700 ${
                  isLoaded ? 'opacity-100 rotate-0 scale-100' : 'opacity-0 rotate-180 scale-50'
                }`}
              />
              <img
                src="/images/turkish-stars-logo.png"
                alt="Turkish Stars"
                className="h-16 md:h-20 w-auto transition-transform group-hover:scale-105"
              />
            </div>
            
            {/* Tagline Box */}
            <div className="hidden sm:block bg-muted/50 rounded-lg px-4 py-2.5 border border-border/50">
              <p className="text-base font-bold text-foreground tracking-tight">
                Bringing Turkish Stars Home — Digitally
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Track stats, matches, and news for your favorite Turkish athletes worldwide.
              </p>
            </div>
          </Link>

          {/* Vertical Divider */}
          <div className="hidden md:block h-12 w-px bg-border/60 mx-6" />

          {/* Right Section: Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-8">
            <Link to="/" className="nav-link-animated text-sm font-medium text-foreground/70 hover:text-foreground transition-colors">
              Home
            </Link>
            <Link to="/athletes" className="nav-link-animated text-sm font-medium text-foreground/70 hover:text-foreground transition-colors">
              Athletes
            </Link>
            <Link to="/admin/tst" className="nav-link-animated text-sm font-medium text-foreground/70 hover:text-foreground transition-colors">
              Admin
            </Link>
          </nav>

          {/* Mobile Menu */}
          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild className="md:hidden">
              <button className="p-2 text-foreground hover:text-accent transition-colors">
                {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[280px] bg-background">
              <div className="flex flex-col gap-4 mt-8">
                <Link
                  to="/"
                  className="text-lg font-medium text-foreground hover:text-accent transition-colors py-2"
                  onClick={() => setIsOpen(false)}
                >
                  Home
                </Link>
                <Link
                  to="/athletes"
                  className="text-lg font-medium text-foreground hover:text-accent transition-colors py-2"
                  onClick={() => setIsOpen(false)}
                >
                  Athletes
                </Link>
                <Link
                  to="/admin/tst"
                  className="text-lg font-medium text-foreground hover:text-accent transition-colors py-2"
                  onClick={() => setIsOpen(false)}
                >
                  Admin
                </Link>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
      
      {/* Animated Accent Bar */}
      <div 
        className={`h-1 bg-accent transition-all duration-700 ease-out ${
          isLoaded ? 'w-full' : 'w-0'
        }`}
      />
    </header>
  );
};

import { useState } from "react";
import { Link } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

export const TurkishStarsHeader = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-24">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-4 group">
            <img
              src="/images/turkish-stars-logo.png"
              alt="Turkish Stars"
              className="h-20 md:h-28 w-auto transition-transform group-hover:scale-105"
            />
            <span className="hidden sm:block text-sm md:text-base text-muted-foreground font-ui">
              <p>Bringing Turkish Stars Home — Digitally</p>
              <p>Follow your favorite Turkish athletes competing around the world.</p>
              <p>Track their stats, upcoming matches, and latest news all in one place.</p>
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-6">
            <Link to="/" className="text-sm font-medium text-foreground/80 hover:text-accent transition-colors">
              Home
            </Link>
            <Link
              to="/admin/tst"
              className="text-sm font-medium text-foreground/80 hover:text-accent transition-colors"
            >
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
    </header>
  );
};

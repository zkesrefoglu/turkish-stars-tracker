import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

interface TurkishStarsHeaderProps {
  transparent?: boolean;
}

export const TurkishStarsHeader = ({ transparent = false }: TurkishStarsHeaderProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const location = useLocation();
  
  // Check if we're on the home page for transparent header
  const isHomePage = location.pathname === "/";
  const shouldBeTransparent = transparent || isHomePage;

  useEffect(() => {
    if (!shouldBeTransparent) return;
    
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 100);
    };
    
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [shouldBeTransparent]);

  const headerBg = shouldBeTransparent
    ? isScrolled
      ? "bg-background/95 backdrop-blur-md border-b border-border"
      : "bg-gradient-to-b from-black/50 to-transparent"
    : "bg-background/95 backdrop-blur-sm border-b border-border";

  const textColor = shouldBeTransparent && !isScrolled
    ? "text-white"
    : "text-foreground";

  return (
    <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${headerBg}`}>
      <div className="container mx-auto px-6">
        <div className="flex items-center justify-between h-20 md:h-24">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-4 group">
            <img
              src="/images/turkish-stars-logo.png"
              alt="Turkish Stars"
              className="h-20 md:h-28 w-auto transition-transform group-hover:scale-105"
            />
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-6">
            <Link to="/" className={`text-sm font-medium ${textColor} opacity-80 hover:opacity-100 hover:text-accent transition-all`}>
              Home
            </Link>
            <Link to="/athletes" className={`text-sm font-medium ${textColor} opacity-80 hover:opacity-100 hover:text-accent transition-all`}>
              Athletes
            </Link>
            <Link
              to="/admin/tst"
              className={`text-sm font-medium ${textColor} opacity-80 hover:opacity-100 hover:text-accent transition-all`}
            >
              Admin
            </Link>
          </nav>

          {/* Mobile Menu */}
          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild className="md:hidden">
              <button className={`p-2 ${textColor} hover:text-accent transition-colors`}>
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
    </header>
  );
};

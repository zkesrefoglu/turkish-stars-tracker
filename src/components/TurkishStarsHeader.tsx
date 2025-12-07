import { useState } from "react";
import { Link } from "react-router-dom";
import { Menu, X, ChevronDown, Star } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const athletes = [
  { name: "Alperen Şengün", slug: "alperen-sengun" },
  { name: "Arda Güler", slug: "arda-guler" },
  { name: "Berke Özer", slug: "berke-ozer" },
  { name: "Can Uzun", slug: "can-uzun" },
  { name: "Ferdi Kadıoğlu", slug: "ferdi-kadioglu" },
  { name: "Kenan Yıldız", slug: "kenan-yildiz" },
];

export const TurkishStarsHeader = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [starsOpen, setStarsOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-20 md:h-24">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-4 group">
            <img 
              src="/images/turkish-stars-logo.png" 
              alt="Turkish Stars" 
              className="h-12 md:h-16 w-auto transition-transform group-hover:scale-105"
            />
            <span className="hidden lg:block text-sm md:text-base text-muted-foreground font-ui max-w-[200px] leading-tight">
              Bringing Turkish Stars Home — Digitally
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-2">
            <Link 
              to="/" 
              className="px-4 py-2 text-base font-medium text-foreground/80 hover:text-accent hover:bg-accent/10 rounded-lg transition-all"
            >
              Home
            </Link>
            
            {/* Stars Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger className="flex items-center gap-1 px-4 py-2 text-base font-medium text-foreground/80 hover:text-accent hover:bg-accent/10 rounded-lg transition-all">
                <Star className="w-4 h-4" />
                Stars
                <ChevronDown className="w-4 h-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 bg-background border border-border shadow-lg">
                {athletes.map((athlete) => (
                  <DropdownMenuItem key={athlete.slug} asChild>
                    <Link 
                      to={`/athlete/${athlete.slug}`}
                      className="w-full cursor-pointer"
                    >
                      {athlete.name}
                    </Link>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <Link 
              to="/admin/tst" 
              className="px-4 py-2 text-base font-medium text-foreground/80 hover:text-accent hover:bg-accent/10 rounded-lg transition-all"
            >
              Admin
            </Link>
          </nav>

          {/* Mobile Menu */}
          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild className="md:hidden">
              <button className="p-2 text-foreground hover:text-accent transition-colors">
                {isOpen ? <X className="w-7 h-7" /> : <Menu className="w-7 h-7" />}
              </button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[300px] bg-background">
              <div className="flex flex-col gap-2 mt-8">
                <Link 
                  to="/" 
                  className="text-lg font-medium text-foreground hover:text-accent hover:bg-accent/10 px-4 py-3 rounded-lg transition-all"
                  onClick={() => setIsOpen(false)}
                >
                  Home
                </Link>
                
                {/* Mobile Stars Accordion */}
                <div className="border-t border-border pt-2">
                  <button 
                    onClick={() => setStarsOpen(!starsOpen)}
                    className="flex items-center justify-between w-full text-lg font-medium text-foreground hover:text-accent hover:bg-accent/10 px-4 py-3 rounded-lg transition-all"
                  >
                    <span className="flex items-center gap-2">
                      <Star className="w-5 h-5" />
                      Stars
                    </span>
                    <ChevronDown className={`w-5 h-5 transition-transform ${starsOpen ? 'rotate-180' : ''}`} />
                  </button>
                  
                  {starsOpen && (
                    <div className="pl-4 flex flex-col gap-1 mt-1">
                      {athletes.map((athlete) => (
                        <Link 
                          key={athlete.slug}
                          to={`/athlete/${athlete.slug}`}
                          className="text-base text-muted-foreground hover:text-accent hover:bg-accent/10 px-4 py-2 rounded-lg transition-all"
                          onClick={() => setIsOpen(false)}
                        >
                          {athlete.name}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>

                <div className="border-t border-border pt-2">
                  <Link 
                    to="/admin/tst" 
                    className="text-lg font-medium text-foreground hover:text-accent hover:bg-accent/10 px-4 py-3 rounded-lg transition-all block"
                    onClick={() => setIsOpen(false)}
                  >
                    Admin
                  </Link>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
};

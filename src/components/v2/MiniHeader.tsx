import { Link } from 'react-router-dom';
import { MagnifyingGlass, Bell } from '@phosphor-icons/react';

export const MiniHeader = () => {
  return (
    <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-lg border-b border-border">
      <div className="flex items-center justify-between px-4 h-14">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2">
          <img 
            src="/images/turkish-stars-logo.png" 
            alt="TST" 
            className="w-8 h-8 object-contain"
          />
          <span className="font-headline font-bold text-lg text-foreground">TST</span>
        </Link>

        {/* Subtitle - Mobile */}
        <p className="text-xs text-muted-foreground font-ui uppercase tracking-wider md:hidden">
          Live Hub
        </p>

        {/* Desktop Nav - Hidden on mobile */}
        <nav className="hidden md:flex items-center gap-6">
          <Link to="/" className="text-sm font-medium text-foreground hover:text-accent transition-colors">
            Home
          </Link>
          <Link to="/athletes" className="text-sm font-medium text-muted-foreground hover:text-accent transition-colors">
            Athletes
          </Link>
          <Link to="/v1" className="text-sm font-medium text-muted-foreground hover:text-accent transition-colors">
            Classic View
          </Link>
        </nav>

        {/* Icons */}
        <div className="flex items-center gap-3">
          <button className="p-2 rounded-full hover:bg-muted transition-colors">
            <MagnifyingGlass size={20} weight="regular" className="text-muted-foreground" />
          </button>
          <button className="relative p-2 rounded-full hover:bg-muted transition-colors">
            <Bell size={20} weight="regular" className="text-muted-foreground" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-destructive rounded-full" />
          </button>
        </div>
      </div>
    </header>
  );
};

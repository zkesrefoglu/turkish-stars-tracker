import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";

// v2 Pages (New Live Hub Design)
import LiveHub from "./pages/LiveHub";
import TurkishStars from "./pages/TurkishStars";
import AthleteProfile from "./pages/AthleteProfile";
import StatsPage from "./pages/StatsPage";
import LivePage from "./pages/LivePage";
import NewsPage from "./pages/NewsPage";

// v1 Legacy Pages
import V1TurkishStarsIndex from "./pages/v1/TurkishStarsIndex";
import V1TurkishStars from "./pages/v1/TurkishStars";
import V1AthleteProfile from "./pages/v1/AthleteProfile";

// Admin Pages
import AdminTST from "./pages/AdminTST";
import TestHeroVideo from "./pages/TestHeroVideo";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          {/* v2 Routes (Default) */}
          <Route path="/" element={<LiveHub />} />
          <Route path="/athletes" element={<TurkishStars />} />
          <Route path="/athlete/:slug" element={<AthleteProfile />} />
          <Route path="/stats" element={<StatsPage />} />
          <Route path="/live" element={<LivePage />} />
          <Route path="/news" element={<NewsPage />} />
          
          {/* v1 Legacy Routes */}
          <Route path="/v1" element={<V1TurkishStarsIndex />} />
          <Route path="/v1/athletes" element={<V1TurkishStars />} />
          <Route path="/v1/athlete/:slug" element={<V1AthleteProfile />} />
          
          {/* Auth & Admin */}
          <Route path="/auth" element={<Auth />} />
          <Route path="/admin/tst" element={<AdminTST />} />
          <Route path="/test-hero" element={<TestHeroVideo />} />
          
          {/* Catch-all */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

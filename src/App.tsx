import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import TurkishStars from "./pages/TurkishStars";
import AthleteProfile from "./pages/AthleteProfile";
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
          <Route path="/" element={<TestHeroVideo />} />
          <Route path="/athletes" element={<TurkishStars />} />
          <Route path="/athlete/:slug" element={<AthleteProfile />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/admin/tst" element={<AdminTST />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

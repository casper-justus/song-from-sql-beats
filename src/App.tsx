
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useUser } from "@clerk/clerk-react";

import { MusicPlayerProvider } from "./contexts/MusicPlayerContext";

import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import LoginPage from "./pages/LoginPage";
import SignUpPage from "./pages/SignUpPage";
import LibraryPage from "./pages/LibraryPage";
import SearchPage from "./pages/SearchPage";
import ProfilePage from "./pages/ProfilePage";
import ClerkProtectedRoute from "./components/auth/ClerkProtectedRoute";
import { BottomNavbar } from "./components/BottomNavbar";
import { BottomNavigation } from "./components/BottomNavigation";

const queryClient = new QueryClient();

const ConditionalBottomNavigation = () => {
  const { isSignedIn } = useUser();
  if (!isSignedIn) return null;
  return (
    <>
      <BottomNavbar />
      <BottomNavigation />
    </>
  );
};

const AppContent = () => (
  <div className={`min-h-screen`}>
    <Routes>
      <Route path="/" element={<Index />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignUpPage />} />

      <Route element={<ClerkProtectedRoute />}>
        <Route path="/library" element={<LibraryPage />} />
        <Route path="/profile" element={<ProfilePage />} />
      </Route>

      <Route path="/search" element={<SearchPage />} />
      <Route path="/terms" element={<div>Terms and Conditions Page (Placeholder)</div>} />
      <Route path="/privacy" element={<div>Privacy Policy Page (Placeholder)</div>} />

      <Route path="*" element={<NotFound />} />
    </Routes>
    <ConditionalBottomNavigation />
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <MusicPlayerProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AppContent />
        </BrowserRouter>
      </TooltipProvider>
    </MusicPlayerProvider>
  </QueryClientProvider>
);

export default App;

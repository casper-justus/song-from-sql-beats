
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useUser } from "@clerk/clerk-react";

import { MusicPlayerProvider } from "./contexts/MusicPlayerContext";
import { ClerkSupabaseProvider } from "./contexts/ClerkSupabaseContext";
import { useKeyboardShortcuts } from "./hooks/useKeyboardShortcuts";

import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import LoginPage from "./pages/LoginPage";
import SignUpPage from "./pages/SignUpPage";
import LibraryPage from "./pages/LibraryPage";
import LikedSongsPage from "./pages/LikedSongsPage";
import SearchPage from "./pages/SearchPage";
import ProfilePage from "./pages/ProfilePage";
import PlaylistDetailPage from "./pages/PlaylistDetailPage"; // Added import
import ClerkProtectedRoute from "./components/auth/ClerkProtectedRoute";
import { BottomNavbar } from "./components/BottomNavbar";
import { BottomNavigation } from "./components/BottomNavigation";
import { DynamicBackground } from "./components/DynamicBackground";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 15 * 60 * 1000, // Increased for better performance
      retry: 3,
      refetchOnWindowFocus: false,
      refetchOnReconnect: 'always',
      retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
  },
});

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

const AppContent = () => {
  // Enable keyboard shortcuts
  useKeyboardShortcuts();
  
  return (
    <div className="min-h-screen relative">
      <DynamicBackground />
      <div className="relative z-10 pb-40"> {/* Increased bottom padding for both bars */}
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignUpPage />} />

          <Route element={<ClerkProtectedRoute />}>
            <Route path="/library" element={<LibraryPage />} />
            <Route path="/liked" element={<LikedSongsPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/playlist/:playlistId" element={<PlaylistDetailPage />} /> {/* Added route */}
          </Route>

          <Route path="/search" element={<SearchPage />} />
          <Route path="/terms" element={<div className="p-8 text-white">Terms and Conditions Page (Placeholder)</div>} />
          <Route path="/privacy" element={<div className="p-8 text-white">Privacy Policy Page (Placeholder)</div>} />

          <Route path="*" element={<NotFound />} />
        </Routes>
      </div>
      <ConditionalBottomNavigation />
    </div>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ClerkSupabaseProvider>
      <MusicPlayerProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <AppContent />
          </BrowserRouter>
        </TooltipProvider>
      </MusicPlayerProvider>
    </ClerkSupabaseProvider>
  </QueryClientProvider>
);

export default App;

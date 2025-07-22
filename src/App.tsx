import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useUser } from "@clerk/clerk-react";
import { useEffect } from "react";
import { StatusBar, Style } from '@capacitor/status-bar';
import { App as CapacitorApp } from '@capacitor/app';

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
import DownloadsPage from "./pages/DownloadsPage";
import ClerkProtectedRoute from "./components/auth/ClerkProtectedRoute";
import { TopNavbar } from "./components/TopNavbar";
import { BottomNavbar } from "./components/BottomNavbar";
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

const AppContent = () => {
  const { isSignedIn } = useUser();
  useKeyboardShortcuts();

  useEffect(() => {
    const setStatusBarStyle = async () => {
      await StatusBar.setStyle({ style: Style.Dark });
      await StatusBar.setOverlaysWebView({ overlay: true });
    };
    setStatusBarStyle();

    CapacitorApp.addListener('appUrlOpen', (data: any) => {
      const url = new URL(data.url);
      const token = url.searchParams.get('__clerk_db_jwt');
      if (token) {
        window.location.href = '/';
      }
    });
  }, []);


  return (
    <div className="min-h-screen relative">
      <DynamicBackground />
      {isSignedIn && <TopNavbar />}
      <div className="relative z-10 pt-24 pb-40">
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignUpPage />} />

          <Route element={<ClerkProtectedRoute />}>
            <Route path="/library" element={<LibraryPage />} />
            <Route path="/liked" element={<LikedSongsPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/playlist/:playlistId" element={<PlaylistDetailPage />} />
            <Route path="/downloads" element={<DownloadsPage />} />
          </Route>

          <Route path="/search" element={<SearchPage />} />
          <Route path="/terms" element={<div className="p-8 text-white">Terms and Conditions Page</div>} />
          <Route path="/privacy" element={<div className="p-8 text-white">Privacy Policy Page</div>} />

          <Route path="*" element={<NotFound />} />
        </Routes>
      </div>
      {isSignedIn && (
        <>
          <BottomNavbar />
        </>
      )}
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

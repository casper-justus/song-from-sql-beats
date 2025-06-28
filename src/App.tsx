
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Auth0Provider } from '@auth0/auth0-react';
import { Auth0ProviderWrapper } from "./contexts/Auth0Context";
import { MusicPlayerProvider } from "./contexts/MusicPlayerContext";
import { useAuth } from "./contexts/Auth0Context";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import LoginPage from "./pages/LoginPage";
import SignUpPage from "./pages/SignUpPage";
import LibraryPage from "./pages/LibraryPage";
import SearchPage from "./pages/SearchPage";
import ProfilePage from "./pages/ProfilePage";
import Auth0ProtectedRoute from "./components/auth/Auth0ProtectedRoute";
import { BottomNavbar } from "./components/BottomNavbar";
import { BottomNavigation } from "./components/BottomNavigation";

const queryClient = new QueryClient();

// Auth0 configuration
const auth0Domain = 'dev-uebw3vwts12kdrcg.eu.auth0.com';
const auth0ClientId = 'Y32vJr4HjpwpsJAQYW9DPiOlAUyD1JsJ';
const auth0ApiIdentifier = 'https://api.songfromsqlbeats.com/api';

// Component to conditionally render bottom navigation
const ConditionalBottomNavigation = () => {
  const { isAuthenticated } = useAuth();
  
  if (!isAuthenticated) return null;
  
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

      {/* Protected Routes */}
      <Route element={<Auth0ProtectedRoute />}>
        <Route path="/library" element={<LibraryPage />} />
        <Route path="/profile" element={<ProfilePage />} />
      </Route>

      {/* Public Routes */}
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
    <Auth0Provider
      domain={auth0Domain}
      clientId={auth0ClientId}
      authorizationParams={{
        redirect_uri: window.location.origin,
        audience: auth0ApiIdentifier,
        scope: 'openid profile email offline_access',
      }}
      cacheLocation="localstorage"
    >
      <Auth0ProviderWrapper>
        <MusicPlayerProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <AppContent />
            </BrowserRouter>
          </TooltipProvider>
        </MusicPlayerProvider>
      </Auth0ProviderWrapper>
    </Auth0Provider>
  </QueryClientProvider>
);

export default App;

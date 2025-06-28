// src/App.tsx (THIS SHOULD NOW BE CORRECT AFTER FIXING Auth0Context.tsx)

import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";

// IMPORT YOUR CUSTOM AUTH0 PROVIDER AND useAuth FROM YOUR CONTEXT FILE
// This import is now correct because your custom Auth0Provider accepts the configuration props
import { Auth0Provider, useAuth } from "./contexts/Auth0Context";

import { MusicPlayerProvider } from "./contexts/MusicPlayerContext";

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

// Auth0 configuration (ideally from .env)
const auth0Domain = 'dev-uebw3vwts12kdrcg.eu.auth0.com';
const auth0ClientId = 'uH5r4isqyR1l3Bile5t4Ztr6Xs1Tc6gA';
const auth0ApiIdentifier = 'https://api.songfromsqlbeats.com/api';

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

      <Route element={<Auth0ProtectedRoute />}>
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
    {/* Now, your custom Auth0Provider accepts the Auth0 configuration props */}
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
      <MusicPlayerProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <AppContent />
          </BrowserRouter>
        </TooltipProvider>
      </MusicPlayerProvider>
    </Auth0Provider>
  </QueryClientProvider>
);

export default App; // This export is perfectly fine.
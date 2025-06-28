
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { MusicPlayerProvider } from "./contexts/MusicPlayerContext";
import { useAuth } from "./contexts/AuthContext";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import LoginPage from "./pages/LoginPage";
import SignUpPage from "./pages/SignUpPage";
import PasswordResetPage from "./pages/PasswordResetPage";
import UpdatePasswordPage from "./pages/UpdatePasswordPage";
import LibraryPage from "./pages/LibraryPage";
import SearchPage from "./pages/SearchPage";
import ProfilePage from "./pages/ProfilePage";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import { BottomNavbar } from "./components/BottomNavbar";
import { BottomNavigation } from "./components/BottomNavigation";

const queryClient = new QueryClient();

// Component to conditionally render bottom navigation
const ConditionalBottomNavigation = () => {
  const { session } = useAuth();
  
  if (!session) return null;
  
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
      <Route path="/password-reset" element={<PasswordResetPage />} />
      <Route path="/update-password" element={<UpdatePasswordPage />} />

      {/* Protected Routes */}
      <Route element={<ProtectedRoute />}>
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
    <AuthProvider>
      <MusicPlayerProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <AppContent />
          </BrowserRouter>
        </TooltipProvider>
      </MusicPlayerProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;

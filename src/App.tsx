import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { MusicPlayerProvider } from "./contexts/MusicPlayerContext";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import LoginPage from "./pages/LoginPage";
import SignUpPage from "./pages/SignUpPage";
import PasswordResetPage from "./pages/PasswordResetPage";
import UpdatePasswordPage from "./pages/UpdatePasswordPage";
import LibraryPage from "./pages/LibraryPage"; // Import LibraryPage
import SearchPage from "./pages/SearchPage";   // Import SearchPage
import ProtectedRoute from "./components/auth/ProtectedRoute"; // Import ProtectedRoute
import { BottomNavbar } from "./components/BottomNavbar";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <MusicPlayerProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <div className="pb-24"> {/* Main content padding for BottomNavbar */}
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/signup" element={<SignUpPage />} />
                <Route path="/password-reset" element={<PasswordResetPage />} />
                <Route path="/update-password" element={<UpdatePasswordPage />} />

                {/* Protected Routes */}
                <Route element={<ProtectedRoute />}>
                  <Route path="/library" element={<LibraryPage />} />
                  {/* Add other protected routes here: /playlists, /profile etc. */}
                </Route>

                {/* Public Routes */}
                <Route path="/search" element={<SearchPage />} />
                {/* Example placeholder routes for terms & privacy, can be simple components or static pages */}
                <Route path="/terms" element={<div>Terms and Conditions Page (Placeholder)</div>} />
                <Route path="/privacy" element={<div>Privacy Policy Page (Placeholder)</div>} />

                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </div>
            <BottomNavbar />
          </BrowserRouter>
        </TooltipProvider>
      </MusicPlayerProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;

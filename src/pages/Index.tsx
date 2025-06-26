import React from 'react';
import { Link, NavLink } from 'react-router-dom'; // Use NavLink for active styling
import MusicPlayer from "@/components/MusicPlayer";
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { LockKeyhole, Home, Search, Library } from 'lucide-react'; // Added icons

const Index = () => {
  const { session, user, signOut, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center text-white">
        <p className="text-lg">Loading user session...</p>
        {/* You could add a spinner here */}
      </div>
    );
  }

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium hover:bg-gray-700 ${
      isActive ? 'bg-gray-700 text-white' : 'text-gray-300'
    }`;


  return (
    // The global gradient is on body, so this page doesn't need specific background unless overriding.
    // Ensure text colors are appropriate for the global gradient.
    <div className="flex flex-col items-center justify-start min-h-screen p-4 text-white">
      {/* Navigation Bar */}
      <header className="w-full max-w-5xl mb-8 sticky top-0 z-40 bg-black/30 backdrop-blur-md rounded-b-lg">
        <nav className="flex justify-between items-center py-3 px-4 sm:px-6">
          <Link to="/" className="text-2xl font-bold text-white">My Awesome App</Link>

          {/* Centered Navigation Links for larger screens */}
          <div className="hidden md:flex items-center space-x-2">
            <NavLink to="/" className={navLinkClass} end>
              <Home size={18} />
              <span>Home</span>
            </NavLink>
            <NavLink to="/search" className={navLinkClass}>
              <Search size={18} />
              <span>Search</span>
            </NavLink>
            {session && (
              <NavLink to="/library" className={navLinkClass}>
                <Library size={18} />
                <span>My Library</span>
              </NavLink>
            )}
          </div>

          <div className="flex items-center space-x-3">
            {session && user ? (
              <>
                <span className="text-sm text-gray-300 hidden lg:inline">Welcome, {user.email?.split('@')[0]}</span>
                <Button variant="outline" onClick={signOut} className="border-gray-600 text-gray-300 hover:bg-gray-700 hover:text-white">Sign Out</Button>
              </>
            ) : (
              <>
                <Button asChild variant="ghost" className="text-gray-300 hover:bg-gray-700 hover:text-white">
                  <Link to="/signup">Sign Up</Link>
                </Button>
                <Button asChild className="bg-white text-black hover:bg-gray-200">
                  <Link to="/login">Log In</Link>
                </Button>
              </>
            )}
          </div>
        </nav>
      </header>

      {/* Main Content Area - Now Index only shows MusicPlayer if logged in, or Access Restricted */}
      {session && user ? (
        // Authenticated View
        <MusicPlayer />
      ) : (
        // Unauthenticated View
        <div className="flex flex-col items-center justify-center text-center mt-16 md:mt-24 p-6">
          <LockKeyhole size={96} className="text-blue-500 mb-6" /> {/* Logo Placeholder */}
          <h2 className="text-3xl font-bold mb-4">Access Restricted</h2>
          <p className="text-lg text-gray-600 dark:text-gray-300 mb-8">
            You need to be logged in to access the awesome Music Player and other features of this application.
          </p>
          <div className="flex space-x-4">
            <Button asChild size="lg">
              <Link to="/login">Login</Link>
            </Button>
            <Button asChild variant="secondary" size="lg">
              <Link to="/signup">Sign Up</Link>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Index;

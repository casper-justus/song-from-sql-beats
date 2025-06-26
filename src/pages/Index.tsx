import React from 'react';
import { Link } from 'react-router-dom';
import MusicPlayer from "@/components/MusicPlayer";
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { LockKeyhole } from 'lucide-react'; // Example Icon

const Index = () => {
  const { session, user, signOut, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center">
        <p className="text-lg">Loading user session...</p>
        {/* You could add a spinner here */}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-start min-h-screen p-4">
      {/* Navigation Bar */}
      <div className="w-full max-w-4xl mb-8">
        <nav className="flex justify-between items-center py-4 px-6 bg-gray-100 dark:bg-gray-800 rounded-md shadow">
          <h1 className="text-xl font-semibold">My Awesome App</h1>
          <div className="flex items-center space-x-4">
            {session && user ? (
              <>
                <span className="text-sm hidden md:inline">Welcome, {user.email}</span>
                <Button variant="outline" onClick={signOut}>Sign Out</Button>
              </>
            ) : (
              <>
                <Button asChild variant="outline">
                  <Link to="/login">Login</Link>
                </Button>
                <Button asChild>
                  <Link to="/signup">Sign Up</Link>
                </Button>
              </>
            )}
          </div>
        </nav>
      </div>

      {/* Main Content Area */}
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

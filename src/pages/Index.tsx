
import React from 'react';
import { Link } from 'react-router-dom';
import MusicPlayer from "@/components/MusicPlayer";
import { useUser, useClerk } from '@clerk/clerk-react';
import { Button } from '@/components/ui/button';
import { LockKeyhole } from 'lucide-react';

const Index = () => {
  const { isSignedIn, user, isLoaded } = useUser();
  const { signOut } = useClerk();

  if (!isLoaded) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center text-white">
        <p className="text-lg">Loading user session...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-start min-h-screen p-4 text-white wave-bg">
      {/* Minimal Top Navigation */}
      <header className="w-full max-w-5xl mb-8 sticky top-0 z-40 bg-black/20 backdrop-blur-md rounded-b-lg">
        <nav className="flex justify-between items-center py-4 px-6">
          <Link to="/" className="text-xl font-bold text-white">MusicApp</Link>
          
          <div className="flex items-center space-x-3">
            {isSignedIn && user ? (
              <>
                <span className="text-sm text-gray-300 hidden sm:inline">
                  {user.fullName || user.emailAddresses[0]?.emailAddress}
                </span>
                <Button 
                  variant="outline" 
                  onClick={() => signOut()} 
                  className="border-gray-600 text-gray-300 hover:bg-gray-700 hover:text-white"
                >
                  Sign Out
                </Button>
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

      {/* Main Content */}
      {isSignedIn && user ? (
        <MusicPlayer />
      ) : (
        <div className="flex flex-col items-center justify-center text-center mt-16 md:mt-24 p-6">
          <LockKeyhole size={96} className="text-blue-500 mb-6" />
          <h2 className="text-3xl font-bold mb-4">Access Restricted</h2>
          <p className="text-lg text-gray-600 dark:text-gray-300 mb-8">
            You need to be logged in to access the Music Player and other features.
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

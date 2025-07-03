
import React from 'react';
import { Link } from 'react-router-dom';
import MusicPlayer from "@/components/MusicPlayer";
import { useUser } from '@clerk/clerk-react';
import { Button } from '@/components/ui/button';
import { LockKeyhole } from 'lucide-react';

const Index = () => {
  const { isSignedIn, user, isLoaded } = useUser();

  if (!isLoaded) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center text-white charcoal-bg wave-bg">
        <p className="text-lg">Loading user session...</p>
      </div>
    );
  }

  return (
    <div className={`flex flex-col items-center justify-start min-h-screen p-4 text-white ${isSignedIn ? 'wave-bg' : 'charcoal-bg wave-bg'}`}>
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

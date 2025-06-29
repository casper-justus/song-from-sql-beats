
import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useUser } from '@clerk/clerk-react';
import { ClerkLoginForm } from '@/components/auth/ClerkLoginForm';

export default function LoginPage() {
  const { isSignedIn, isLoaded } = useUser();
  const navigate = useNavigate();

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      navigate('/');
    }
  }, [isSignedIn, isLoaded, navigate]);

  if (!isLoaded || isSignedIn) {
    return (
      <div className="flex items-center justify-center min-h-screen charcoal-bg">
        <div className="bg-black/20 backdrop-blur-lg rounded-full px-8 py-4 border border-white/20">
          <p className="text-white text-lg">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 sm:p-6 charcoal-bg wave-bg">
      {/* App Logo */}
      <div className="mb-12 text-center">
        <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full flex items-center justify-center shadow-2xl">
          <span className="text-2xl font-bold text-black">♪</span>
        </div>
        <h1 className="text-4xl font-bold text-white mb-2">Music Stream</h1>
        <p className="text-gray-400 text-lg">Millions of songs. Free on Music Stream.</p>
      </div>

      <div className="w-full max-w-md">
        <ClerkLoginForm />
      </div>

      <div className="mt-8 text-center">
        <p className="text-sm text-gray-400 mb-4">Don't have an account?</p>
        <Link 
          to="/signup"
          className="inline-block px-6 py-3 bg-transparent border-2 border-gray-500 text-white hover:border-white hover:bg-white/10 rounded-full font-semibold text-base transition-all"
        >
          Sign up for Music Stream
        </Link>
      </div>

      <p className="mt-8 text-xs text-gray-500 text-center max-w-md leading-relaxed">
        This site is protected by Clerk and the Google Privacy Policy and Terms of Service apply.
      </p>
    </div>
  );
}

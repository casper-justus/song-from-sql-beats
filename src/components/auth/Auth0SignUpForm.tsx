
import React from 'react';
import { useAuth } from '@/contexts/Auth0Context';
import { Button } from '@/components/ui/button';

export function Auth0SignUpForm() {
  const { loginWithRedirect, isLoading } = useAuth();

  const handleSignUp = () => {
    loginWithRedirect({
      authorizationParams: {
        screen_hint: 'signup',
      },
    });
  };

  return (
    <div className="space-y-5">
      <Button
        onClick={handleSignUp}
        disabled={isLoading}
        className="w-full text-black font-bold py-3 text-base hover:scale-105 transform transition-transform duration-200 bg-green-500 hover:bg-green-400"
      >
        {isLoading ? 'Loading...' : 'Sign Up with Auth0'}
      </Button>
      
      <div className="text-center">
        <p className="text-sm text-gray-400">
          Create your account securely with Auth0
        </p>
      </div>
    </div>
  );
}

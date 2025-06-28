
import React from 'react';
import { useAuth } from '@/contexts/Auth0Context';
import { Button } from '@/components/ui/button';
import { FaGoogle } from 'react-icons/fa';

export function Auth0LoginForm() {
  const { loginWithRedirect, isLoading } = useAuth();

  const handleLogin = () => {
    loginWithRedirect();
  };

  return (
    <div className="space-y-6">
      <Button
        onClick={handleLogin}
        disabled={isLoading}
        className="w-full h-12 bg-green-500 hover:bg-green-400 text-black font-bold text-base rounded-full transition-all hover:scale-105 transform shadow-lg"
      >
        {isLoading ? 'Loading...' : 'Log In with Auth0'}
      </Button>
      
      <div className="text-center">
        <p className="text-sm text-gray-400">
          Secure authentication powered by Auth0
        </p>
      </div>
    </div>
  );
}

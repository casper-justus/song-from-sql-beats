import React, { useState } from 'react';
import { signInWithGoogle } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { FaGoogle } from 'react-icons/fa'; // Example using react-icons for Google icon

export function SocialLogins() {
  const [loadingGoogle, setLoadingGoogle] = useState(false);
  const [error, setError] = useState<string | null>(null); // Keep error state for direct feedback if needed
  const { toast } = useToast();

  const handleGoogleSignIn = async () => {
    setLoadingGoogle(true);
    setError(null);
    try {
      const { error: googleError } = await signInWithGoogle();
      if (googleError) {
        setError(googleError.message); // Set local error
        toast({
          title: "Google Sign-In Failed",
          description: googleError.message,
          variant: "destructive",
        });
      }
      // Supabase handles redirection, so no explicit navigation here if successful
    } catch (e: any) {
      const errorMessage = e.message || "An unexpected error occurred with Google Sign-In.";
      setError(errorMessage); // Set local error
      toast({
        title: "Google Sign-In Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoadingGoogle(false);
    }
  };

  return (
    <div className="space-y-3">
      {/* {error && <p className="text-red-400 text-xs text-center">{error}</p>} */}
      <Button
        variant="outline"
        className="w-full flex items-center justify-center space-x-2 border-gray-500 text-white hover:border-white hover:text-white py-3 text-sm font-semibold"
        onClick={handleGoogleSignIn}
        disabled={loadingGoogle}
      >
        <FaGoogle className="w-5 h-5" />
        <span>{loadingGoogle ? 'Redirecting...' : 'Continue with Google'}</span>
      </Button>
      {/* Add more social login buttons here as needed, e.g. Facebook, Apple */}
      {/* Example for another button:
      <Button
        variant="outline"
        className="w-full flex items-center justify-center space-x-2 border-gray-500 text-white hover:border-white hover:text-white py-3 text-sm font-semibold"
        // onClick={handleAppleSignIn}
        // disabled={loadingApple}
      >
        <FaApple className="w-5 h-5" />
        <span>Continue with Apple</span>
      </Button>
      */}
    </div>
  );
}

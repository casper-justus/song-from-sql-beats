import React, { useState } from 'react';
import { signInWithGoogle } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
// You can import icons for social buttons if you have them, e.g., from lucide-react
// import { ChromeIcon } from 'lucide-react';

export function SocialLogins() {
  const [loadingGoogle, setLoadingGoogle] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const handleGoogleSignIn = async () => {
    setLoadingGoogle(true);
    setError(null);
    try {
      const { error: googleError } = await signInWithGoogle();
      if (googleError) {
        setError(googleError.message);
        toast({
          title: "Google Sign-In Failed",
          description: googleError.message,
          variant: "destructive",
        });
      }
      // Supabase handles redirection, so no explicit navigation here if successful
    } catch (e: any) {
      setError(e.message || "An unexpected error occurred with Google Sign-In.");
      toast({
        title: "Google Sign-In Error",
        description: e.message || "An unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setLoadingGoogle(false);
    }
  };

  return (
    <div className="space-y-2">
      {error && <p className="text-red-500 text-sm">{error}</p>}
      <Button
        variant="outline"
        className="w-full"
        onClick={handleGoogleSignIn}
        disabled={loadingGoogle}
      >
        {/* <ChromeIcon className="mr-2 h-4 w-4" /> Optional Icon */}
        {loadingGoogle ? 'Redirecting to Google...' : 'Sign in with Google'}
      </Button>
      {/* Add more social login buttons here as needed */}
    </div>
  );
}

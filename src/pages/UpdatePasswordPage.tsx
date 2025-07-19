import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { updateUserPassword } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"; // Removed CardDescription
import { useToast } from '@/components/ui/use-toast';

// Example: Spotify-like green color
const spotifyGreen = "#1DB954";

import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { updateUserPassword } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"; // Removed CardDescription
import { useToast } from '@/components/ui/use-toast';
import { DynamicBackground } from '@/components/DynamicBackground';

// Example: Spotify-like green color
const spotifyGreen = "#1DB954";

export default function UpdatePasswordPage() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  useEffect(() => {
    const hash = location.hash;
    if (hash.includes('error_description')) {
      const params = new URLSearchParams(hash.substring(1));
      const errorDesc = params.get('error_description');
      setError(`Error: ${errorDesc || 'Invalid recovery link.'}`);
      toast({
        title: "Password Update Error",
        description: `Error: ${errorDesc || 'Invalid recovery link.'}`,
        variant: "destructive",
      });
    } else if (!hash.includes('access_token') && !message && !error) { // Only warn if no message/error already shown
        // Initial load without a token might not be an error yet, user hasn't tried to submit.
        // console.warn("No access token found in URL. Ensure you've arrived from a password reset link.");
    }
  }, [location, toast, message, error]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null); // Clear previous errors
    setMessage(null);

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      toast({ title: "Error", description: "Passwords do not match.", variant: "destructive" });
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters long.");
      toast({ title: "Error", description: "Password must be at least 6 characters long.", variant: "destructive" });
      return;
    }

    setLoading(true);
    const { error: updateError } = await updateUserPassword(password);
    setLoading(false);

    if (updateError) {
      setError(updateError.message);
      toast({
        title: "Password Update Failed",
        description: updateError.message,
        variant: "destructive",
      });
    } else {
      setMessage('Password updated successfully! Redirecting to login...');
      toast({
        title: "Password Updated!",
        description: "You can now log in with your new password.",
      });
      setTimeout(() => navigate('/login'), 3000);
    }
  };

  // Show a specific message if user lands here without a token (e.g. direct navigation)
  // and hasn't tried submitting yet.
  const showInvalidLinkMessage = !location.hash.includes('access_token') && !loading && !message && !error;


  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 sm:p-6">
      <DynamicBackground />
      <div className="mb-8 text-center">
        <h1 className="text-4xl font-bold text-white">Your App Name</h1>
      </div>

      <Card className="w-full max-w-md bg-gray-800/50 border-gray-700 shadow-2xl rounded-xl">
        <CardHeader className="text-center pt-8 pb-4">
          <CardTitle className="text-2xl sm:text-3xl font-bold text-white">Set new password</CardTitle>
        </CardHeader>
        <CardContent className="p-6 sm:p-8">
          {showInvalidLinkMessage && (
            <p className="text-yellow-400 text-sm text-center mb-4">
              This link may be invalid or expired. Please request a new password reset if needed.
            </p>
          )}
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && <p className="text-red-400 text-sm text-center mb-3">{error}</p>}
            {message && <p className="text-spotifyGreen text-sm text-center mb-3">{message}</p>}
            <div>
              <Label htmlFor="new-password" className="text-sm font-medium text-gray-300 sr-only">New password</Label>
              <Input
                id="new-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="New password"
                className="bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:ring-spotifyGreen focus:border-spotifyGreen"
                disabled={loading || !!message} // Disable if success message is shown
              />
            </div>
            <div>
              <Label htmlFor="confirm-password" className="text-sm font-medium text-gray-300 sr-only">Confirm new password</Label>
              <Input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                placeholder="Confirm new password"
                className="bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:ring-spotifyGreen focus:border-spotifyGreen"
                disabled={loading || !!message} // Disable if success message is shown
              />
            </div>
            <Button
              type="submit"
              className="w-full text-black font-bold py-3 text-base hover:scale-105 transform transition-transform duration-200"
              style={{ backgroundColor: spotifyGreen }}
              disabled={loading || !!message} // Disable if success message is shown
            >
              {loading ? 'Updating Password...' : 'Set New Password'}
            </Button>
          </form>
        </CardContent>
        {!message && ( // Only show "Back to Login" if no success message (implying process is ongoing or failed)
            <CardFooter className="p-6 sm:p-8 border-t border-gray-700 mt-2 text-center">
                <Link to="/login" className="text-sm text-gray-400 hover:text-white hover:underline">
                    Back to Login
                </Link>
            </CardFooter>
        )}
      </Card>
    </div>
  );
}

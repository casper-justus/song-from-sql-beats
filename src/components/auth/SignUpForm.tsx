import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signUpWithEmailPassword } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';

// Example: Spotify-like green color
const spotifyGreen = "#1DB954";

export function SignUpForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null); // For success messages
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);

    const { data, error: signUpError } = await signUpWithEmailPassword(email, password);
    setLoading(false);

    if (signUpError) {
      setError(signUpError.message);
      toast({
        title: "Sign Up Failed",
        description: signUpError.message,
        variant: "destructive",
      });
    } else if (data.user && data.user.identities && data.user.identities.length === 0) {
      setMessage("This email is already registered. If it's yours, please check your inbox to confirm your account, or try logging in.");
      toast({
        title: "Registration Notice",
        description: "This email is already registered. Please check your email to confirm your account or try logging in.",
      });
    } else if (data.user && data.session === null) {
      setMessage('Sign up successful! Please check your email to verify your account.');
      toast({
        title: "Sign Up Successful!",
        description: "Please check your email to verify your account.",
      });
      // Don't navigate immediately, let user see the message.
    } else if (data.session) {
      setMessage('Sign up successful and logged in!');
      toast({
        title: "Sign Up Successful!",
        description: "You are now logged in.",
      });
      navigate('/');
    } else {
      setError("An unexpected error occurred during sign up. Please try again.");
      toast({
        title: "Sign Up Failed",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && <p className="text-red-400 text-sm text-center mb-3">{error}</p>}
      {message && <p className="text-spotifyGreen text-sm text-center mb-3">{message}</p>}
      <div>
        <Label htmlFor="signup-email" className="text-sm font-medium text-gray-300 sr-only">What's your email?</Label>
        <Input
          id="signup-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          placeholder="What's your email?"
          className="bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:ring-spotifyGreen focus:border-spotifyGreen"
        />
      </div>
      <div>
        <Label htmlFor="signup-password" className="text-sm font-medium text-gray-300 sr-only">Create a password</Label>
        <Input
          id="signup-password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          placeholder="Create a password"
          className="bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:ring-spotifyGreen focus:border-spotifyGreen"
          // Supabase default min password length is 6
        />
      </div>
      {/* Could add a "Confirm Password" field here for better UX */}
      <Button
        type="submit"
        className="w-full text-black font-bold py-3 text-base hover:scale-105 transform transition-transform duration-200"
        style={{ backgroundColor: spotifyGreen }}
        disabled={loading}
      >
        {loading ? 'Creating account...' : 'Sign Up'}
      </Button>
    </form>
  );
}

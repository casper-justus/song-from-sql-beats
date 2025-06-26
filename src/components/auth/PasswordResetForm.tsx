import React, { useState } from 'react';
import { sendPasswordResetEmail } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';

// Example: Spotify-like green color
const spotifyGreen = "#1DB954";

export function PasswordResetForm() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);

    const { error: resetError } = await sendPasswordResetEmail(email);
    setLoading(false);

    if (resetError) {
      setError(resetError.message);
      toast({
        title: "Error Sending Reset Email",
        description: resetError.message,
        variant: "destructive",
      });
    } else {
      setMessage('If an account exists for this email, a password reset link has been sent. Please check your inbox.');
      toast({
        title: "Password Reset Email Sent",
        description: "If an account exists for this email, you'll receive a reset link shortly.",
      });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && <p className="text-red-400 text-sm text-center mb-3">{error}</p>}
      {message && <p className="text-spotifyGreen text-sm text-center mb-3">{message}</p>}
      <div>
        <Label htmlFor="reset-email" className="text-sm font-medium text-gray-300 sr-only">Email address</Label>
        <Input
          id="reset-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          placeholder="Email address"
          className="bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:ring-spotifyGreen focus:border-spotifyGreen"
        />
      </div>
      <Button
        type="submit"
        className="w-full text-black font-bold py-3 text-base hover:scale-105 transform transition-transform duration-200"
        style={{ backgroundColor: spotifyGreen }}
        disabled={loading}
      >
        {loading ? 'Sending Link...' : 'Get Reset Link'}
      </Button>
    </form>
  );
}

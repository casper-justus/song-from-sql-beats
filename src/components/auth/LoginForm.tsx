import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signInWithEmailPassword } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';

// Example: Spotify-like green color
const spotifyGreen = "#1DB954";

export function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error: signInError } = await signInWithEmailPassword(email, password);
    setLoading(false);
    if (signInError) {
      setError(signInError.message);
      toast({
        title: "Login Failed",
        description: signInError.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Login Successful",
        description: "Redirecting...",
        // Consider a less intrusive toast for dark theme success
      });
      navigate('/'); // Redirect to home page on successful login
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && <p className="text-red-400 text-sm text-center mb-3">{error}</p>}
      <div>
        <Label htmlFor="email" className="text-sm font-medium text-gray-300 sr-only">Email address</Label>
        <Input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          placeholder="Email address"
          className="bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:ring-spotifyGreen focus:border-spotifyGreen"
        />
      </div>
      <div>
        <Label htmlFor="password" className="text-sm font-medium text-gray-300 sr-only">Password</Label>
        <Input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          placeholder="Password"
          className="bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:ring-spotifyGreen focus:border-spotifyGreen"
        />
      </div>
      <Button
        type="submit"
        className="w-full text-black font-bold py-3 text-base hover:scale-105 transform transition-transform duration-200"
        style={{ backgroundColor: spotifyGreen }}
        disabled={loading}
      >
        {loading ? 'Logging in...' : 'Log In'}
      </Button>
    </form>
  );
}

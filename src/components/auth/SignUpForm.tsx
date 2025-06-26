import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signUpWithEmailPassword } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';

export function SignUpForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
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
      // This case might indicate the user already exists but is unconfirmed or another issue.
      // Supabase v2 might return a user object with an empty identities array if email confirmation is pending
      // or if the user exists but is unconfirmed.
      // For a new user requiring confirmation, data.session is null and data.user is non-null.
      setMessage("User already registered. Please check your email to confirm your account or try logging in.");
      toast({
        title: "Registration Notice",
        description: "User already registered. Please check your email to confirm your account or try logging in.",
      });
    } else if (data.user && data.session === null) {
      // This is the typical case for a new sign-up when email confirmation is required.
      setMessage('Sign up successful! Please check your email to verify your account.');
      toast({
        title: "Sign Up Successful",
        description: "Please check your email to verify your account.",
      });
      // Optionally, redirect or clear form
      // navigate('/login'); // Or stay on page to show message
    } else if (data.session) {
      // This case implies auto-confirmation is on, or the user was already confirmed and signed in.
      setMessage('Sign up successful and logged in!');
      toast({
        title: "Sign Up Successful",
        description: "You are now logged in.",
      });
      navigate('/');
    } else {
        // Fallback for unexpected response
        setError("An unexpected error occurred during sign up. Please try again.");
        toast({
            title: "Sign Up Failed",
            description: "An unexpected error occurred.",
            variant: "destructive",
        });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <p className="text-red-500">{error}</p>}
      {message && <p className="text-green-500">{message}</p>}
      <div>
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          placeholder="you@example.com"
        />
      </div>
      <div>
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          placeholder="•••••••• (min 6 characters)"
        />
      </div>
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? 'Signing up...' : 'Sign Up'}
      </Button>
    </form>
  );
}
